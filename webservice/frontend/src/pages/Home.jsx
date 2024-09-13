import React, { useEffect, useRef, useState } from "react";

function Home() {
    const [recording, setRecording] = useState(false);
    const isActiveRef = useRef(false);
    const socketRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const [currentDialogue, setCurrentDialogue] = useState("");
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const rafIdRef = useRef(null);
    const timeoutRef = useRef(null);

    const AUDIO_THRESHOLD = 20; // Threshold for when it counts as speaking
    const ACTIVATION_DURATION = 1000; // Time in ms to consider voice as active

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
            // Select and capture audio from microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            // Analyze Audio
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            console.log(analyserRef.current);
            analyserRef.current.fftSize = 256;
            const bufferLength = analyserRef.current.frequencyBinCount;
            dataArrayRef.current = new Uint8Array(bufferLength);
            console.log(dataArrayRef.current);
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);

            setRecording(true); // Update state to indicate streaming has started
            console.log("Connected and recording");

            mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, {
                mimeType: "audio/webm;codecs=opus",
                audioBitsPerSecond: "16000",
            });

            // This send our audio data to our backend
            mediaRecorderRef.current.ondataavailable = (event) => {
                console.log("Is available");
                if (socketRef.current && event.data.size > 0 && socketRef.current.readyState === WebSocket.OPEN && isActiveRef.current) {
                    socketRef.current.send(event.data);
                    console.log("Data sent");
                }
            };

            analyzeAudio();
        };
        socketRef.current.addEventListener("message", (event) => {
            console.log(event.data);
            // setCurrentDialogue(event.data);
        });

        socketRef.current.onclose = () => {
            stopRecording(); // Ensure we clean up if the WebSocket closes unexpectedly
        };
    };

    const stopRecording = () => {
        if (!recording) return; // Prevents stopping if it's not streaming

        // Stop the media recorder and close the WebSocket connection
        cancelAnimationFrame(rafIdRef.current);
        clearTimeout(timeoutRef.current);

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
        }

        if (socketRef.current) {
            socketRef.current.close();
        }

        // Reset the refs and state
        audioContextRef.current = null;
        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;
        socketRef.current = null;

        setRecording(false);
        isActiveRef.current = false;
        console.log("Stopping recording!");
    };

    const analyzeAudio = () => {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const dataArray = [...dataArrayRef.current];
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;

        // console.log(avg);
        // console.log(mediaRecorderRef.current)

        if (avg > AUDIO_THRESHOLD) {
            clearTimeout(timeoutRef.current);
            if (!isActiveRef.current && mediaRecorderRef.current.state === "inactive") {
                isActiveRef.current = true;
                mediaRecorderRef.current.start(1000);
                console.log("Voice activated, started recording");
            }
        } else if (isActiveRef.current) {
            timeoutRef.current = setTimeout(() => {
                console.log(mediaRecorderRef.current)
                if (mediaRecorderRef.current) {
                    mediaRecorderRef.current.stop();
                }
                isActiveRef.current = false;
                console.log("Voice deactivated, stopped recording");
            }, ACTIVATION_DURATION);
        }

        rafIdRef.current = requestAnimationFrame(analyzeAudio);
    };

    useEffect(() => {
        return () => {
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            cancelAnimationFrame(rafIdRef.current);
        };
    }, []);

    return (
        <div className="flex items-center h-screen bg-red-500 ">
            <div className="flex justify-evenly mx-auto w-[1280px]">
                <button
                    className="flex items-center justify-center text-4xl bg-green-500 rounded-lg shadow-md shadow-black min-w-96 min-h-72"
                    onClick={toggleRecording}
                >
                    {recording ? "STOP" : "START"}
                </button>
                <div className="bg-gray-200 border-2 border-black rounded-lg w-72">{currentDialogue}</div>
            </div>
        </div>
    );
}

export default Home;
