import React, { useRef, useState } from "react";

function Home() {
    const [recording, setRecording] = useState(false);
    const socketRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);

    const toggleRecording = () => {
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = async () => {
        if (recording) return; // Prevents starting the stream if it's already active

        // Initialize WebSocket connection
        socketRef.current = new WebSocket("ws://localhost:8000/ws");

        socketRef.current.onopen = async () => {
            // Capture audio from microphone
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, {
                mimeType: "audio/webm",
            });

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0 && socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.send(event.data);
                }
            };

            mediaRecorderRef.current.start(100); // Send data in chunks every 100ms
            setRecording(true); // Update state to indicate streaming has started
        };

        socketRef.current.onclose = () => {
            stopRecording(); // Ensure we clean up if the WebSocket closes unexpectedly
        };
    };

    const stopRecording = () => {
        if (!recording) return; // Prevents stopping if it's not streaming

        // Stop the media recorder and close the WebSocket connection
        mediaRecorderRef.current?.stop();
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        socketRef.current?.close();

        // Reset the refs and state
        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;
        socketRef.current = null;

        setRecording(false); // Update state to indicate streaming has stopped
    };

    return (
        <div className="flex items-center h-screen bg-red-500">
            <button
                className="flex items-center justify-center mx-auto text-4xl bg-green-500 min-w-96 min-h-72"
                onClick={toggleRecording}
            >
                {recording ? "STOP" : "PLAY"}
            </button>
        </div>
    );
}

export default Home;
