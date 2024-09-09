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

# I have rewritten this function a million times but still get encoding errors
# See whispermodel.py for encoding examples.


async def process_audio(datastream):

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        temp_audio.write(datastream)
        temp_audio_path = temp_audio.name
    start = time()
    results = model.transcribe(temp_audio_path)
    end = time()
    print(f"Took: {end-start} seconds")
    return results


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        try:
            # Here we recieve our blobs as bytes
            data = await websocket.receive_bytes()
            # print(data)
            # print(len(data))
            # print(type(data))
            transcription = await process_audio(data)
            print(transcription)
            # await websocket.send_text(f"Transcription: {transcription}")

        except WebSocketDisconnect as e:
            print(e)
            break
