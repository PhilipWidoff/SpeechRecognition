import os
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import torch
import whisper
import tempfile
import json
from google.cloud import translate_v2 as translate
from google.cloud import texttospeech
import base64

# Setup logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Load Google Cloud API key from environment variable
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = os.getenv('GOOGLE_CLOUD_API_KEY_PATH')
logger.info(f"Google Cloud API Key Path: {os.getenv('GOOGLE_CLOUD_API_KEY_PATH')}")

# Initialize FastAPI app
app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup Google Translate and TTS clients
translate_client = translate.Client()
tts_client = texttospeech.TextToSpeechClient()

# Connect to GPU if available, otherwise use CPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
logger.info(f"Using device: {device}")

# Load Whisper model
logger.info("Loading Whisper model...")
model = whisper.load_model("base").to(device)
logger.info("Whisper model loaded successfully")

def translate_text(text: str, target_language: str) -> str:
    logger.debug(f"Translating text to {target_language}")
    try:
        result = translate_client.translate(text, target_language=target_language)
        logger.debug("Translation successful")
        return result['translatedText']
    except Exception as e:
        logger.error(f"Translation error: {e}", exc_info=True)
        return "Translation error"

def text_to_speech(text: str, language_code: str):
    logger.debug(f"Converting text to speech in {language_code}")
    try:
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        response = tts_client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
        logger.debug("Text-to-speech conversion successful")
        return response.audio_content
    except Exception as e:
        logger.error(f"TTS error: {e}", exc_info=True)
        return None

async def process_audio(audio_chunks):
    logger.debug("Starting audio processing")
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
    os.makedirs(temp_dir, exist_ok=True)
    logger.debug(f"Temporary directory: {temp_dir}")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm", dir=temp_dir) as temp_audio:
        for chunk in audio_chunks:
            temp_audio.write(chunk)
        temp_audio_path = temp_audio.name
    logger.debug(f"Temporary audio file created at: {temp_audio_path}")

    try:
        logger.debug("Attempting to transcribe audio")
        logger.debug(f"Audio file size: {os.path.getsize(temp_audio_path)} bytes")
        logger.debug(f"Audio file exists: {os.path.exists(temp_audio_path)}")
        
        results = model.transcribe(temp_audio_path)
        logger.debug("Transcription successful")
        return results
    except Exception as e:
        logger.error(f"Transcription error: {e}", exc_info=True)
        return None
    finally:
        logger.debug(f"Cleaning up temporary file: {temp_audio_path}")
        try:
            os.remove(temp_audio_path)
            logger.debug("Temporary file removed successfully")
        except Exception as e:
            logger.error(f"Error removing temporary file: {e}", exc_info=True)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection accepted")
    audio_chunks = []
    target_language = "en"  # Default to English
    last_translation = ""

    try:
        while True:
            try:
                message = await websocket.receive()
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected")
                break
            except Exception as e:
                logger.error(f"Error receiving WebSocket message: {e}")
                break

            logger.debug(f"Received message type: {message.get('type')}")

            if message["type"] == "websocket.disconnect":
                logger.info("Received disconnect message")
                break

            if "text" in message:
                data = json.loads(message["text"])
                if "target_language" in data:
                    target_language = data["target_language"]
                    logger.info(f"Updated target language to: {target_language}")
            elif "bytes" in message:
                audio_chunks.append(message["bytes"])
                logger.debug(f"Received audio chunk, total chunks: {len(audio_chunks)}")

                transcription = await process_audio(audio_chunks)
                if not transcription:
                    logger.warning("Transcription failed, continuing to next chunk")
                    continue

                text = transcription["text"]
                detected_language = transcription["language"]
                logger.info(f"Detected language: {detected_language}")
                logger.info(f"Transcribed text: {text}")

                translated_text = translate_text(text, target_language=target_language)
                logger.info(f"Translated text: {translated_text}")

                tts_audio = text_to_speech(translated_text, language_code=target_language)

                tts_audio_base64 = base64.b64encode(tts_audio).decode('utf-8') if tts_audio else None

                response = {
                    "transcription": text,
                    "translation": translated_text,
                    "detected_language": detected_language,
                    "tts_audio": tts_audio_base64
                }

                logger.debug("Sending response to client")
                await websocket.send_json(response)

                # Reset audio chunks and update last translation
                audio_chunks = []
                last_translation = translated_text

    except Exception as e:
        logger.error(f"Error during WebSocket communication: {e}", exc_info=True)
    finally:
        logger.info("Closing WebSocket connection")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting FastAPI server")
    uvicorn.run(app, host="0.0.0.0", port=8000)