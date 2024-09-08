from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel


# class AudioData(BaseModel):


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
