import React, { useRef, useState } from "react";

function Home() {
    const [recording, setRecording] = useState(false);
    const socketRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordingIntervalRef = useRef(null);
    const [currentDialogue, setCurrentDialogue] = useState("");

    // Dropdown state
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState('Choose a language');
    const options = ['English', 'Spanish', 'Mandarin', 'French', 'German',
         'Portuguese', 'Russian', 'Japanese', 'Arabic', 'Hindi', 'Korean',
        'Italian', 'Turkish', 'Dutch', 'Swedish'];


    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleOptionClick = (option) => {
        setSelectedOption(option);
        setIsOpen(false);
    };

    const toggleRecording = () => {
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = async () => {
        if (recording) return;

        socketRef.current = new WebSocket("ws://localhost:8000/ws");

        socketRef.current.onopen = async () => {
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, {
                mimeType: "audio/webm;codecs=opus",
                audioBitsPerSecond: "16000",
            });
            setRecording(true);
            console.log("Connected and recording");

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0 && socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.send(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                console.log("New chunk!!");
                mediaRecorderRef.current.start();
            };

            mediaRecorderRef.current.start();
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
            stopRecording();
        };
    };

    const stopRecording = () => {
        if (!recording) return;

        clearInterval(recordingIntervalRef.current);
        mediaRecorderRef.current?.stop();
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        socketRef.current?.close();

        recordingIntervalRef.current = null;
        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;
        socketRef.current = null;

        setRecording(false);
        console.log("Stopping recording!");
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-red-500">
            {/* Dropdown */}
            <div className="relative w-[1280px] mb-8">
                <button
                    onClick={toggleDropdown}
                    className="w-64 mx-auto flex items-center justify-between bg-white p-3 text-lg font-normal rounded-lg shadow-md"
                >
                    <span>{selectedOption}</span>
                    <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {isOpen && (
                    <ul className="absolute left-1/2 transform -translate-x-1/2 w-64 mt-2 py-2 bg-white rounded-lg shadow-lg z-10">
                        {options.map((option, index) => (
                            <li
                                key={index}
                                onClick={() => handleOptionClick(option)}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                                {option}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Existing boxes */}
            <div className="flex justify-evenly w-[1280px]">
                <button
                    className="flex items-center justify-center text-4xl bg-green-500 rounded-lg shadow-md shadow-black min-w-96 min-h-72"
                    onClick={toggleRecording}
                >
                    {recording ? "STOP" : "PLAY"}
                </button>
                <div className="bg-gray-200 border-2 border-black rounded-lg w-72 flex items-center justify-center p-4">
                    {currentDialogue}
                </div>
            </div>
        </div>
    );
}

export default Home;