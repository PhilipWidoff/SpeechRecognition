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
from concurrent.futures import ThreadPoolExecutor

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

# Check if GPU is available
use_gpu = torch.cuda.is_available()
num_gpus = torch.cuda.device_count() if use_gpu else 0
logger.info(f"GPU available: {use_gpu}, Number of GPUs: {num_gpus}")

# Create a pool of worker threads
num_workers = num_gpus if use_gpu else os.cpu_count()
thread_pool = ThreadPoolExecutor(max_workers=num_workers)

def initialize_worker(worker_id):
    if use_gpu:
        torch.cuda.set_device(worker_id)
        device = torch.device(f"cuda:{worker_id}")
        logger.info(f"Worker initialized with GPU {worker_id}")
    else:
        device = torch.device("cpu")
        logger.info(f"Worker initialized with CPU (worker ID: {worker_id})")
    
    model = whisper.load_model("base").to(device)
    logger.info(f"Whisper model loaded on {'GPU' if use_gpu else 'CPU'} {worker_id}")
    
    return model

# Initialize models
models = [thread_pool.submit(initialize_worker, i) for i in range(num_workers)]
models = [model.result() for model in models]

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

async def process_audio(audio_chunks, worker_id):
    logger.debug(f"Starting audio processing on {'GPU' if use_gpu else 'CPU'} {worker_id}")
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
    os.makedirs(temp_dir, exist_ok=True)
    logger.debug(f"Temporary directory: {temp_dir}")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm", dir=temp_dir) as temp_audio:
        for chunk in audio_chunks:
            temp_audio.write(chunk)
        temp_audio_path = temp_audio.name
    logger.debug(f"Temporary audio file created at: {temp_audio_path}")

    try:
        logger.debug(f"Attempting to transcribe audio on {'GPU' if use_gpu else 'CPU'} {worker_id}")
        logger.debug(f"Audio file size: {os.path.getsize(temp_audio_path)} bytes")
        logger.debug(f"Audio file exists: {os.path.exists(temp_audio_path)}")
        
        results = models[worker_id].transcribe(temp_audio_path)
        logger.debug(f"Transcription successful on {'GPU' if use_gpu else 'CPU'} {worker_id}")
        return results
    except Exception as e:
        logger.error(f"Transcription error on {'GPU' if use_gpu else 'CPU'} {worker_id}: {e}", exc_info=True)
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
    current_worker = 0  # Initialize worker counter

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
                logger.debug(f"Message: {message}")
                
                if message["bytes"] == b"STOP":
                    # Use the current worker and rotate to the next one
                    worker_to_use = current_worker
                    current_worker = (current_worker + 1) % num_workers

                    transcription = await process_audio(audio_chunks, worker_to_use)
                    if not transcription:
                        logger.warning(f"Transcription failed on {'GPU' if use_gpu else 'CPU'} {worker_to_use}, continuing to next chunk")
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

    except Exception as e:
        logger.error(f"Error during WebSocket communication: {e}", exc_info=True)
    finally:
        logger.info("Closing WebSocket connection")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting FastAPI server")
    uvicorn.run(app, host="0.0.0.0", port=8000)