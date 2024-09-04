from fastapi import FastAPI, WebSocket
import whispermodel

app = FastAPI()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_bytes()
        print(type(data))
        # transcription = await whispermodel.process_audio(data)
        # print(transcription)
        await websocket.send_text("Accepted bytes")
