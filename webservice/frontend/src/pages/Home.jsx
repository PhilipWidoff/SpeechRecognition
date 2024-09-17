import React, { useRef, useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

function Home() {
    const [recording, setRecording] = useState(false);
    const socketRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordingIntervalRef = useRef(null);
    const [currentDialogue, setCurrentDialogue] = useState("");
    const [translatedText, setTranslatedText] = useState("");
    const [detectedLanguage, setDetectedLanguage] = useState("");
    const [audioSrc, setAudioSrc] = useState("");
    const [selectedLanguage, setSelectedLanguage] = useState("English");
    const [isOpen, setIsOpen] = useState(false);
    const audioRef = useRef(null);
    const languages = [
        { label: "English", code: "en" },
        { label: "Spanish", code: "es" },
        { label: "Mandarin", code: "zh" },
        { label: "French", code: "fr" },
        { label: "German", code: "de" },
        { label: "Portuguese", code: "pt" },
        { label: "Russian", code: "ru" },
        { label: "Japanese", code: "ja" },
        { label: "Arabic", code: "ar" },
        { label: "Hindi", code: "hi" },
        { label: "Korean", code: "ko" },
        { label: "Italian", code: "it" },
        { label: "Turkish", code: "tr" },
        { label: "Dutch", code: "nl" },
        { label: "Swedish", code: "sv" },
    ];
    const dropdownRef = useRef(null);
    const isActiveRef = useRef(false);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const rafIdRef = useRef(null);
    const timeoutRef = useRef(null);

    const AUDIO_THRESHOLD = 40; // Threshold for when it counts as speaking
    const ACTIVATION_DURATION = 1000; // Time in ms to consider voice as active

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.load();
            audioRef.current.play();
        }
    }, [audioSrc]);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleLanguageSelect = (language) => {
        setSelectedLanguage(language);
        setIsOpen(false);

        if (recording) {
            stopRecording();
            startRecording();
        }
    };

    const toggleRecording = () => {
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const createMediaRecorder = (stream) => {
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: "audio/webm",
            audioBitsPerSecond: 16000,
        });

        let audioChunks = []; // Creating buffer

        // This send our audio data to our backend
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            if (
                socketRef.current &&
                socketRef.current.readyState === WebSocket.OPEN &&
                isActiveRef.current &&
                audioChunks.length > 0
            ) {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                socketRef.current.send(audioBlob);
                console.log("Full audio buffer sent");
            }
            audioChunks = [];
        };
        return mediaRecorder;
    };

    const startRecording = async () => {
        if (recording) return;

        console.log("Attempting to connect to WebSocket");
        socketRef.current = new WebSocket("ws://192.168.15.253:8000/ws");

        socketRef.current.onopen = async () => {
            console.log("WebSocket connection established");
            const languageCode = languages.find((lang) => lang.label === selectedLanguage).code;
            console.log(`Sending target language: ${languageCode}`);
            socketRef.current.send(JSON.stringify({ target_language: languageCode }));

            try {
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

                mediaRecorderRef.current = createMediaRecorder(mediaStreamRef.current);

                analyzeAudio();
            } catch (error) {
                console.error("Error accessing media devices:", error);
                stopRecording();
            }
        };

        socketRef.current.onmessage = async (event) => {
            console.log("Received message from server");
            const data = JSON.parse(event.data);

            if (data.transcription) {
                setCurrentDialogue(data.transcription);
                setDetectedLanguage(data.detected_language);
            }

            if (data.translation) {
                setTranslatedText(data.translation);
            }

            if (data.tts_audio) {
                console.log("Received audio data, creating blob");
                const binaryString = window.atob(data.tts_audio);
                const binaryData = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    binaryData[i] = binaryString.charCodeAt(i);
                }

                const blob = new Blob([binaryData], { type: "audio/mp3" });
                const url = URL.createObjectURL(blob);
                setAudioSrc(url);
            }
        };

        socketRef.current.onerror = (error) => {
            console.error("WebSocket Error:", error);
            stopRecording();
        };

        socketRef.current.onclose = () => {
            console.log("WebSocket closed");
            stopRecording();
        };
    };

    const analyzeAudio = () => {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const dataArray = [...dataArrayRef.current];
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;

        // console.log(avg);
        // console.log(mediaRecorderRef.current)
        // console.log(isActiveRef.current);
        if (avg > AUDIO_THRESHOLD) {
            isActiveRef.current = true;
            if (mediaRecorderRef.current.state === "inactive") {
                mediaRecorderRef.current.start(100);
                console.log("Voice activated, started recording");
            }
            clearTimeout(timeoutRef.current);
        } else if (isActiveRef.current) {
            clearTimeout(timeoutRef.current);
            isActiveRef.current = false;
            timeoutRef.current = setTimeout(() => {
                if (mediaRecorderRef.current.state === "recording") {
                    mediaRecorderRef.current.stop();
                    console.log("Voice deactivated, stopped recording");
                }
            }, ACTIVATION_DURATION);
        }
        rafIdRef.current = requestAnimationFrame(analyzeAudio);
    };

    const stopRecording = () => {
        if (!recording) return;

        console.log("Stopping recording");
        cancelAnimationFrame(rafIdRef.current);
        clearTimeout(timeoutRef.current);

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
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

        setRecording(false);
        isActiveRef.current = false;
        console.log("Recording stopped");
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
        <div className="flex flex-col items-center justify-center min-h-screen absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,#C9EBFF,transparent)] p-4">
            <div className="w-full max-w-4xl">
                <div className="flex justify-between space-x-4">
                    <div className="flex flex-col items-center w-5/12">
                        <div className="flex justify-center w-full mb-4">
                            <button
                                className="px-6 py-3 text-xl text-white bg-green-500 rounded-lg shadow-md hover:bg-green-600"
                                onClick={toggleRecording}
                            >
                                {recording ? "STOP" : "PLAY"}
                            </button>
                        </div>
                        <div className="w-1/2 px-4 py-2 mb-2 text-base text-center bg-white rounded-lg shadow-md">
                            <span className="font-semibold">Detected: </span>
                            {detectedLanguage}
                        </div>
                    </div>

                    <div className="flex flex-col items-center w-5/12">
                        <div className="flex justify-center w-full mb-4" ref={dropdownRef}>
                            <div className="relative w-1/2">
                                <button
                                    onClick={toggleDropdown}
                                    className="flex items-center justify-between w-full p-2 text-sm font-normal bg-white rounded-lg shadow-lg hover:bg-gray-100"
                                >
                                    <span>{selectedLanguage}</span>
                                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {isOpen && (
                                    <div className="absolute left-0 right-0 z-10 mt-1 overflow-y-auto bg-white rounded-lg shadow-lg max-h-48">
                                        {languages.map((language, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleLanguageSelect(language.label)}
                                                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
                                            >
                                                {language.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="w-1/2 px-4 py-2 mb-2 text-base text-center bg-white rounded-lg shadow-md">
                            <span className="font-semibold">Target: </span>
                            {selectedLanguage}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center mt-4 space-x-4">
                    <div className="flex flex-col items-center w-5/12">
                        <div className="w-full p-4 overflow-auto bg-gray-200 border-2 border-black rounded-lg h-72">
                            {currentDialogue}
                        </div>
                        <p className="mt-2 text-2xl font-semibold">Transcription</p>
                    </div>

                    <div className="flex flex-col items-center w-5/12">
                        <div className="w-full p-4 overflow-auto bg-gray-200 border-2 border-black rounded-lg h-72">
                            {translatedText}
                        </div>
                        <p className="mt-2 text-2xl font-semibold">Translation</p>
                    </div>
                </div>

                {audioSrc && (
                    <div className="flex justify-center mt-4">
                        <audio ref={audioRef} controls key={audioSrc}>
                            <source src={audioSrc} type="audio/mp3" />
                        </audio>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Home;
