import React, { useRef, useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

function Home() {
    const [recording, setRecording] = useState(false);
    const socketRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordingIntervalRef = useRef(null);
    const [currentDialogue, setCurrentDialogue] = useState("");

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
                mimeType: "audio/webm;codecs=opus",
                audioBitsPerSecond: "16000",
            });
            setRecording(true); // Update state to indicate streaming has started
            console.log("Connected and recording");

            // This send our audio data to our backend
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0 && socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.send(event.data);
                }
            };

      mediaRecorderRef.current.onstop = () => {
        console.log("New chunk!!");
        mediaRecorderRef.current.start();
      };

            mediaRecorderRef.current.start(); // Send data in chunks every 100ms
            recordingIntervalRef.current = setInterval(() => {
                if (mediaRecorderRef.current.state === "recording") {
                    mediaRecorderRef.current.stop();
                }
            }, 5000);
        };

    socketRef.current.addEventListener("message", (event) => {
      console.log(event.data);
      setCurrentDialogue(event.data);
    });

        socketRef.current.onclose = () => {
            stopRecording(); // Ensure we clean up if the WebSocket closes unexpectedly
        };
    };

    const stopRecording = () => {
        if (!recording) return; // Prevents stopping if it's not streaming

        // Stop the media recorder and close the WebSocket connection
        clearInterval(recordingIntervalRef.current);
        mediaRecorderRef.current?.stop();
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        socketRef.current?.close();

        // Reset the refs and state
        recordingIntervalRef.current = null;
        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;
        socketRef.current = null;

        setRecording(false); // Update state to indicate streaming has stopped
        console.log("Stopping recording!");
    };

    return (
        <div className="flex items-center h-screen bg-red-500 ">
            <div className="flex justify-evenly mx-auto w-[1280px]">
                <button
                    className="flex items-center justify-center text-4xl bg-green-500 rounded-lg shadow-md shadow-black min-w-96 min-h-72"
                    onClick={toggleRecording}
                >
                    {recording ? "STOP" : "PLAY"}
                </button>
                <div className="bg-gray-200 border-2 border-black rounded-lg w-72">{currentDialogue}</div>
            </div>
        </div>
    );
}

export default Home;
