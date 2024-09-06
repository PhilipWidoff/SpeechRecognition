from fastapi import FastAPI, WebSocket
from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
from aiortc.contrib.media import MediaBlackhole, MediaPlayer
import json
import asyncio

app = FastAPI()


class AudioTrack(MediaStreamTrack):
    kind = "audio"

    def __init__(self, track):
        super().__init__()
        self.track = track

    async def recv(self):
        frame = await self.track.recv()
        return frame


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    pc = RTCPeerConnection()

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"Connection state is {pc.connectionState}")
        if pc.connectionState == "failed":
            await pc.close()

    @pc.on("track")
    def on_track(track):
        print(f"Track {track.kind} received")
        if track.kind == "audio":
            pc.addTrack(AudioTrack(track))

    while True:
        try:
            message = await websocket.receive_text()
            obj = json.loads(message)

            if obj["type"] == "offer":
                offer = RTCSessionDescription(sdp=obj["sdp"], type=obj["type"])
                await pc.setRemoteDescription(offer)

                answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)

                await websocket.send_text(json.dumps({
                    "type": "answer",
                    "sdp": pc.localDescription.sdp,
                }))
            elif obj["type"] == "ice_candidate":
                candidate = obj["candidate"]
                await pc.addIceCandidate(candidate)
        except Exception as e:
            print(f"Error: {e}")
            break

    await pc.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
