from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import torch
import whisper
import tempfile
from time import time
from googletrans import Translator

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


# def translate_text(text: str) -> str:
#     target_language = "ar"  # Change this to your target language code
#     translated = translator.translate(text, dest=target_language)
#     translated_text = translated.text
#     return translated_text


def compile_json(transcription: str, translation: str, detected_lang: str) -> dict:
    ...


async def process_audio(datastream):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        for chunk in datastream:
            temp_audio.write(chunk)
        temp_audio_path = temp_audio.name
    start = time()
    results = model.transcribe(temp_audio_path)
    end = time()
    print(f"Took: {end-start} seconds")
    return results


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    audio_chunks = []
    while True:
        try:
            # Here we recieve our audio as bytes
            data = await websocket.receive_bytes()
            audio_chunks.append(data)
            # print(len(audio_chunks)) # Number of chunks processed

            # Potentially use some noice reduction

            transcription = await process_audio(audio_chunks)
            print(transcription["text"])
            print(transcription["language"])

            # Translation
            # translated_text = translate_text(text=transcription["text"])

            # print(translated_text)
            # Eventually send new json to frontend
            # compile_json(
            #     transcription=transcription["text"], translation=translated_text, detected_lang=transcription["language"])

            # await websocket.send_json()

            await websocket.send_text(transcription["text"])
            await websocket.send_text(transcription["language"])
        except WebSocketDisconnect as e:
            print(e)
            break


@app.get("/tts")
async def get_tts(text: str):
    ...
