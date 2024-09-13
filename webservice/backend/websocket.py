from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import torch
import whisper
import tempfile
from time import time
from google.cloud import translate_v2 as translate
import os
import json
from google.cloud import texttospeech
import io

# Initialize FastAPI app
app = FastAPI()

# CORS setup to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Adjust this based on your frontend address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup Google Translate and TTS clients
translate_client = translate.Client()
tts_client = texttospeech.TextToSpeechClient()

# Connect to GPU if available, otherwise use CPU
def connect_gpu():
    if torch.cuda.is_available():
        device = torch.device("cuda")
        print(f"Using GPU: {torch.cuda.get_device_name(0)}")
        print(f"Total GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
        print(f"CUDA version: {torch.version.cuda}")
    else:
        device = torch.device("cpu")
        print("No GPU available, using CPU")
    return device

device = connect_gpu()

# Load Whisper model
model = whisper.load_model("base").to(device=device)

# Translate text using Google Cloud Translate
def translate_text(text: str, target_language: str = "ar") -> str:
    try:
        result = translate_client.translate(text, target_language=target_language)
        translated_text = result.get('translatedText', 'Translation error')
        return translated_text
    except Exception as e:
        print(f"Translation error: {e}")
        return "Translation error"

# Text-to-Speech function using Google Cloud TTS
def text_to_speech(text: str, language_code: str = "en-US"):
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
        return response.audio_content
    except Exception as e:
        print(f"TTS error: {e}")
        return None

# Process audio and perform transcription
async def process_audio(audio_chunks):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        for chunk in audio_chunks:
            temp_audio.write(chunk)
        temp_audio_path = temp_audio.name

    results = model.transcribe(temp_audio_path)
    os.remove(temp_audio_path)  # Clean up the temporary file
    return results

# WebSocket endpoint to handle real-time audio streaming
import base64

# WebSocket endpoint to handle real-time audio streaming
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    audio_chunks = []
    target_language = "ar"  # Default to Arabic for translation

    try:
        while True:
            message = await websocket.receive()

            if "text" in message:
                data = message["text"]
                try:
                    json_data = json.loads(data)
                    if "target_language" in json_data:
                        target_language = json_data["target_language"]
                        print(f"Updated target language to: {target_language}")
                except json.JSONDecodeError:
                    print("Invalid JSON received.")
            elif "bytes" in message:
                audio_chunks.append(message["bytes"])

                # Process audio for transcription
                transcription = await process_audio(audio_chunks)
                text = transcription["text"]
                language = transcription["language"]

                # Translate the transcription
                translated_text = translate_text(text, target_language=target_language)

                # Generate TTS audio for the translated text
                tts_audio = text_to_speech(translated_text, language_code=target_language)

                # Encode the audio content to base64 to send over WebSocket
                tts_audio_base64 = base64.b64encode(tts_audio).decode('utf-8') if tts_audio else None

                # Prepare the response with transcription, translation, and TTS audio
                response = {
                    "transcription": text,
                    "translation": translated_text,
                    "detected_language": language,
                    "tts_audio": tts_audio_base64
                }

                # Send the response to the frontend
                await websocket.send_json(response)

    except WebSocketDisconnect:
        print("Client disconnected.")
    except Exception as e:
        print(f"Error during WebSocket communication: {e}")
        await websocket.close()


    except WebSocketDisconnect:
        print("Client disconnected.")
    except Exception as e:
        print(f"Error during WebSocket communication: {e}")
        await websocket.close()
