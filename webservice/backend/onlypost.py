from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
import whisper
import tempfile
import os
import time


# class AudioData(BaseModel):

model = whisper.load_model("base")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/audio/")
async def send_audio(audio: UploadFile = File(...)):
    file_location = f".temp/{audio.filename}"
    with open(file_location, "wb") as buffer:
        buffer.write(await audio.read())

    return {"info": f"file '{audio.filename} saved at '{file_location}"}


@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    start = time.time()
    audio_bytes = await audio.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        temp_audio.write(audio_bytes)
        temp_audio_path = temp_audio.name
    try:
        result = model.transcribe(temp_audio_path)
        end = time.time()
        print(f"Took: {end-start} seconds")
        return result
    finally:
        os.unlink(temp_audio_path)
