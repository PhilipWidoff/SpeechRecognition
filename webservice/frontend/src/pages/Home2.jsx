import React, { useEffect, useRef, useState } from 'react';

function Home2() {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const peerConnection = useRef(null);
  const webSocket = useRef(null);

  useEffect(() => {
    webSocket.current = new WebSocket('ws://localhost:8000/ws');
    webSocket.current.onopen = () => console.log('WebSocket connected');
    webSocket.current.onmessage = handleSignalingMessage;

    return () => {
      if (webSocket.current) webSocket.current.close();
      if (peerConnection.current) peerConnection.current.close();
    };
  }, []);

  const handleSignalingMessage = async (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'answer') {
      const remoteDesc = new RTCSessionDescription(message);
      await peerConnection.current.setRemoteDescription(remoteDesc);
    } else if (message.type === 'ice_candidate') {
      await peerConnection.current.addIceCandidate(message.candidate);
    }
  };

  const startStreaming = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          webSocket.current.send(JSON.stringify({
            type: 'ice_candidate',
            candidate: event.candidate
          }));
        }
      };

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      webSocket.current.send(JSON.stringify({
        type: 'offer',
        sdp: peerConnection.current.localDescription.sdp
      }));

      setIsConnected(true);
    } catch (error) {
      console.error('Error starting stream:', error);
    }
  };

  const stopStreaming = () => {
    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach(sender => {
        if (sender.track) sender.track.stop();
      });
      peerConnection.current.close();
    }
    setIsConnected(false);
  };

  const toggleMute = () => {
    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach(sender => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = isMuted;
        }
      });
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="App">
      <h1>WebRTC Audio Streaming</h1>
      {!isConnected ? (
        <button onClick={startStreaming}>Start Streaming</button>
      ) : (
        <>
          <button onClick={stopStreaming}>Stop Streaming</button>
          <button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
        </>
      )}
    </div>
  );
}

export default Home2;