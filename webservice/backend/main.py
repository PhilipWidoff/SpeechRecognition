from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List
import whispermodel

app = FastAPI()


class ConnectionManager:
    def __init__(self):
        self.active_connection: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connection.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connection.remove(websocket)

    async def broadcast(self, data: bytes):
        # Use the datastream to send to our LLM.
        # await connection.send_bytes(data)
        whispermodel.process_audio(data)


manager = ConnectionManager()


@app.websocket("/ws/audio")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_bytes()
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
