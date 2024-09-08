import React, { useEffect, useRef, useState } from "react";

function Home2() {
    const [recording, setRecording] = useState(false);
    // const [linesRecorded, setLinesRecorded] = useState()
    let fileNumber = 1
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingIntervalRef = useRef(null);

    const toggleRecording = () => {
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = async () => {
        if (recording) return;
        setRecording(true);
        console.log("Recording started!!");
        // console.log("State of recording: " + recording)

        audioChunksRef.current = [];

        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, {
            mimeType: "audio/webm",
        });

        mediaRecorderRef.current.ondataavailable = (e) => {
            // console.log(e.data.size);
            // console.log(e.data);
            audioChunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
            console.log("Audio Chunks:", audioChunksRef.current);
            processAudioChunks();
            audioChunksRef.current = [];
        };

        mediaRecorderRef.current.start();
        recordingIntervalRef.current = setInterval(() => {
            if (mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
        }, 5000);
    };

    // const recordInterval = () => {
    //     mediaRecorderRef.current.start();

    //     recordingIntervalRef.current = setInterval(() => {
    //         mediaRecorderRef.current.stop();
    //         console.log("Audio Chunks:", audioChunksRef.current);
    //         processAudioChunks()
    //         audioChunksRef.current = [];
    //         mediaRecorderRef.current.start(); // Restart recording after resetting
    //     }, 3000);
    // };

    const processAudioChunks = async () => {
        // console.log("processing")
        if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            await sendAudio(blob);
            audioChunksRef.current = [];
        }        
        mediaRecorderRef.current.start();
    };

    const sendAudio = async (audioBlob) => {
        const formData = new FormData();
        formData.append("audio", audioBlob, `snippet${fileNumber}.webm`);
        fileNumber += 1
        try {
            await fetch("http://localhost:8000/api/audio/", {  // Address to api
                method: "POST",
                body: formData,
            });
            console.log("Audio sent to backend");
        } catch (error) {
            console.error("Error sending audio:", error);
        }
    };

    const stopRecording = () => {
        if (!recording) return;
        clearInterval(recordingIntervalRef.current);
        mediaRecorderRef.current?.stop();
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;

        setRecording(false);
        console.log("Recording stopped!!");
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
export default Home2;
