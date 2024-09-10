from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import whisper
import io
import numpy as np
import asyncio
from pydub import AudioSegment
import tempfile
from time import time

model = whisper.load_model("base")


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


## Add gpu to make whisper model go brrrr
def connect_gpu():
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
            # Here we recieve our blobs as bytes
            data = await websocket.receive_bytes()
            audio_chunks.append(data)
            print(len(audio_chunks))
            transcription = await process_audio(audio_chunks)
            print(transcription["text"])

            ## Translation
            ## Eventual send new json to frontend

            await websocket.send_text(transcription["text"])
        except WebSocketDisconnect as e:
            print(e)
            break
