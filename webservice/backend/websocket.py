from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import torch
import whisper
import tempfile
from google.cloud import translate_v2 as translate
from google.cloud import texttospeech
import base64
import os
import json
import asyncio

# Initialize FastAPI app
app = FastAPI()
os.environ["PATH"] += os.pathsep + r"C:\path\to\ffmpeg\bin"

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
    else:
        device = torch.device("cpu")
        print("No GPU available, using CPU")
    return device

device = connect_gpu()

# Load Whisper model for transcription
model = whisper.load_model("base").to(device=device)

# Translate text using Google Cloud Translate
def translate_text(text: str, target_language: str = "ar") -> str:
    try:
        result = translate_client.translate(text, target_language=target_language)
        return result.get('translatedText', 'Translation error')
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

# Process audio and perform transcription using Whisper
async def process_audio(audio_chunks):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
        for chunk in audio_chunks:
            temp_audio.write(chunk)
        temp_audio_path = temp_audio.name

    results = model.transcribe(temp_audio_path)
    os.remove(temp_audio_path)  # Clean up the temporary file
    return results

# WebSocket endpoint to handle real-time audio streaming
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    audio_chunks = []
    target_language = "en"  # Default language
    
    try:
        while True:
            message = await websocket.receive()
            
            # Check if the message is a control message or audio data
            if "bytes" in message:
                audio_chunks.append(message["bytes"])
                
                # Process audio once enough chunks are collected
                if len(audio_chunks) > 5:  # Adjust the chunk size threshold
                    transcription = await process_audio(audio_chunks)
                    text = transcription["text"]
                    language = transcription["language"]

                    # Translate the transcription
                    translated_text = translate_text(text, target_language=target_language)

                    # Generate TTS audio from the translated text
                    tts_audio = await asyncio.to_thread(text_to_speech, translated_text, language_code=target_language)

                    # Encode and send the data back to the client
                    tts_audio_base64 = base64.b64encode(tts_audio).decode('utf-8') if tts_audio else None

                    await websocket.send_json({
                        "transcription": text,
                        "detected_language": language,
                        "translation": translated_text,
                        "tts_audio": tts_audio_base64
                    })

                    audio_chunks = []  # Clear after processing

            elif "text" in message:
                # Parse control messages (like changing the target language)
                try:
                    data = json.loads(message["text"])
                    if data["type"] == "control" and data["action"] == "change_language":
                        target_language = data["target_language"]
                        await websocket.send_json({"status": "language_changed", "target_language": target_language})
                except json.JSONDecodeError as e:
                    print(f"Error parsing message: {e}")
       
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"Error occurred: {e}")
        await websocket.close()

