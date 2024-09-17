from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import torch
import whisper
import tempfile
from time import time
from googletrans import Translator
import os
import ffmpeg

# pip install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu116

app = FastAPI()

translator = Translator()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Add gpu to make whisper model go brrrr
def connect_gpu():
    if torch.cuda.is_available():
        device = torch.device("cuda")
        print(f"Using GPU: {torch.cuda.get_device_name(0)}")
        print(
            f"Total GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
        print(f"CUDA version: {torch.version.cuda}")
    else:
        device = torch.device("cpu")
        print("No GPU available, using CPU")
    return device


device = connect_gpu()

model = whisper.load_model("base").to(device=device)


def translate_text(text: str) -> str:
    target_language = "ar"  # Change this to your target language code
    translated = translator.translate(text, dest=target_language)
    translated_text = translated.text
    return translated_text


def compile_json(transcription: str, translation: str, detected_lang: str) -> dict:
    ...

def is_valid_audio(file_path):
    try:
        probe = ffmpeg.probe(file_path)
        audio_stream = next((stream for stream in probe['streams'] if stream['codec_type'] == 'audio'), None)
        return audio_stream is not None
    except ffmpeg.Error:
        return False

async def process_audio(temp_audio_path):
    if not is_valid_audio(temp_audio_path):
        raise ValueError("Invalid or corrupted audio file")
    try:
        start = time()
        results = model.transcribe(temp_audio_path)
        end = time()
        print(f"Took: {end-start} seconds")
    except Exception:
        results = {"text": "Error"}
        print("Error: Transcribing failed")
    return results


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")

    while True:
        try:
            # Here we recieve our audio as bytes
            data = await websocket.receive_bytes()

            # Potentially use some noice reduction

            if data == b"STOP":
                temp_audio.flush()
                temp_audio.close()

                transcription = await process_audio(temp_audio.name)
                print(transcription)
                # print(transcription["text"])
                # await websocket.send_text(transcription["text"])

                os.unlink(temp_audio.name)

                temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
            else:
                temp_audio.write(data)
            # # Translation
            # translated_text = translate_text(text=transcription["text"])

            # print(translated_text)
            # Eventually send new json to frontend
            # compile_json(
            #     transcription=transcription["text"], translation=translated_text, detected_lang=transcription["language"])

            # await websocket.send_json()

        except WebSocketDisconnect as e:
            print(e)
            break


@app.get("/tts")
async def get_tts(text: str):
    ...
