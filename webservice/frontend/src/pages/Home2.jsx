import React, { useEffect, useRef, useState } from "react";

function Home2() {
    const [recording, setRecording] = useState(false);
    // const [linesRecorded, setLinesRecorded] = useState()
    let fileNumber = 1;
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingIntervalRef = useRef(null);
    const [currentLang, setCurrentLang] = useState("");
    const [currentDialogue, setCurrentDialogue] = useState("");

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
        fileNumber += 1;
        try {
            const response = await fetch("http://localhost:8000/api/transcribe", {
                // Address to api
                method: "POST",
                body: formData,
            });
            console.log("Audio sent to backend");

            const data = await response.json();

            handleResponseData(data);
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

    const handleResponseData = (data) => {
        setCurrentDialogue(prevDialogue => prevDialogue + ` ${data.text}`)
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
export default Home2;
