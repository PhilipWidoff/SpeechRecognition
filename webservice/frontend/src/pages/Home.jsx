import React, { useRef, useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Save, Trash2, XCircle } from "lucide-react";

function Home() {
    const [recording, setRecording] = useState(false);
    const socketRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordingIntervalRef = useRef(null);
    const [currentDialogue, setCurrentDialogue] = useState([]);
    const [translatedText, setTranslatedText] = useState([]);
    const [detectedLanguage, setDetectedLanguage] = useState("");
    const [audioSrc, setAudioSrc] = useState("");
    const [selectedLanguage, setSelectedLanguage] = useState("English");
    const [isOpen, setIsOpen] = useState(false);
    const [savedTranslations, setSavedTranslations] = useState([]);
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

    const AUDIO_THRESHOLD = 25;
    const ACTIVATION_DURATION = 1000;

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

        let audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && audioChunks.length > 15) {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                socketRef.current.send(audioBlob);
            }
            audioChunks = [];
        };
        return mediaRecorder;
    };

    const startRecording = async () => {
        if (recording) return;

        socketRef.current = new WebSocket("ws://192.168.15.253:8000/ws");

        socketRef.current.onopen = async () => {
            const languageCode = languages.find((lang) => lang.label === selectedLanguage).code;
            socketRef.current.send(JSON.stringify({ target_language: languageCode }));

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaStreamRef.current = stream;

                audioContextRef.current = new AudioContext();
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
                const bufferLength = analyserRef.current.frequencyBinCount;
                dataArrayRef.current = new Uint8Array(bufferLength);
                const source = audioContextRef.current.createMediaStreamSource(stream);
                source.connect(analyserRef.current);

                setRecording(true);

                mediaRecorderRef.current = createMediaRecorder(mediaStreamRef.current);

                analyzeAudio();
            } catch (error) {
                console.error("Error accessing media devices:", error);
                stopRecording();
            }
        };

        socketRef.current.onmessage = async (event) => {
            const data = JSON.parse(event.data);

            if (data.transcription) {
                setCurrentDialogue((prev) => [...prev, data.transcription]); // Append transcription
                setDetectedLanguage(data.detected_language);
            }

            if (data.translation) {
                setTranslatedText((prev) => [...prev, data.translation]); // Append translation
            }

            if (data.tts_audio) {
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
            stopRecording();
        };
    };

    const analyzeAudio = () => {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const dataArray = [...dataArrayRef.current];
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;

        if (avg > AUDIO_THRESHOLD) {
            isActiveRef.current = true;
            if (mediaRecorderRef.current.state === "inactive") {
                mediaRecorderRef.current.start(100);
            }
            clearTimeout(timeoutRef.current);
        } else if (isActiveRef.current) {
            clearTimeout(timeoutRef.current);
            isActiveRef.current = false;
            timeoutRef.current = setTimeout(() => {
                if (mediaRecorderRef.current.state === "recording") {
                    mediaRecorderRef.current.stop();
                }
            }, ACTIVATION_DURATION);
        }
        rafIdRef.current = requestAnimationFrame(analyzeAudio);
    };

    const stopRecording = () => {
        if (!recording) return;

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
    };

    const handleSaveTranslation = () => {
        if (translatedText.length > 0 && audioSrc) {
            setSavedTranslations((prev) => [
                ...prev,
                { text: translatedText[translatedText.length - 1], audio: audioSrc, time: new Date().toLocaleString(), volume: 1 },
            ]);
        }
    };

    const handleClear = () => {
        setCurrentDialogue([]);
        setTranslatedText([]);
    };

    const handleDeleteTranslation = (index) => {
        setSavedTranslations((prev) => prev.filter((_, i) => i !== index));
    };

    const handleVolumeChange = (index, newVolume) => {
        const updatedTranslations = [...savedTranslations];
        updatedTranslations[index].volume = newVolume;
        setSavedTranslations(updatedTranslations);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-300 via-purple-300 to-pink-400 p-8">
            <div className="w-full max-w-5xl bg-white/30 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/50">
                <div className="flex justify-center mb-10">
                    <h1 className="text-4xl font-extrabold text-white tracking-wide">Language Translation App</h1>
                </div>

                <div className="flex justify-between mb-12">
                    <div className="flex flex-col items-center w-5/12 space-y-8">
                        <button
                            className="px-10 py-5 text-lg font-bold text-white bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-xl hover:shadow-2xl transition-all focus:outline-none transform hover:scale-105"
                            onClick={toggleRecording}
                        >
                            {recording ? "STOP" : "PLAY"}
                        </button>

                        <div className="w-full py-4 px-6 text-lg bg-white/80 rounded-2xl shadow-lg backdrop-blur-md text-center text-black font-medium">
                            <span className="font-semibold">Detected Language: </span>{detectedLanguage}
                        </div>
                    </div>

                    <div className="flex flex-col items-center w-5/12 space-y-8">
                        <div className="relative w-full">
                            <button
                                onClick={toggleDropdown}
                                className="flex items-center justify-between w-full px-8 py-5 text-lg font-medium text-black bg-white/80 rounded-full shadow-lg hover:shadow-2xl transition-all focus:outline-none transform hover:scale-105"
                            >
                                <span>{selectedLanguage}</span>
                                {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                            </button>

                            {isOpen && (
                                <div className="absolute left-0 right-0 z-20 mt-2 overflow-y-auto bg-white/90 backdrop-blur-lg border border-gray-200 rounded-2xl shadow-xl max-h-48">
                                    {languages.map((language, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleLanguageSelect(language.label)}
                                            className="w-full px-6 py-3 text-lg text-left text-gray-700 hover:bg-gray-100 transition-all focus:outline-none"
                                        >
                                            {language.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="w-full py-4 px-6 text-lg bg-white/80 rounded-2xl shadow-lg backdrop-blur-md text-center text-black font-medium">
                            <span className="font-semibold">Target Language: </span>{selectedLanguage}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between space-x-8">
                    <div className="flex flex-col items-center w-5/12 space-y-4">
                        <div className="w-full p-6 overflow-auto bg-white/70 border border-gray-300 rounded-3xl shadow-lg backdrop-blur-lg h-72">
                            {currentDialogue.map((dialogue, index) => (
                                <p key={index}>{dialogue}</p>
                            ))}
                        </div>
                        <p className="text-2xl font-bold text-white">Transcription</p>
                    </div>

                    <div className="flex flex-col items-center w-5/12 space-y-4">
                        <div className="w-full p-6 overflow-auto bg-white/70 border border-gray-300 rounded-3xl shadow-lg backdrop-blur-lg h-72">
                            {translatedText.map((text, index) => (
                                <p key={index}>{text}</p>
                            ))}
                        </div>
                        <div className="flex space-x-4">
                            <button
                                onClick={handleSaveTranslation}
                                className="px-4 py-2 text-lg font-bold text-white bg-blue-500 rounded-full hover:bg-blue-600 transition-all flex items-center"
                            >
                                <Save className="mr-2" /> Save Translation
                            </button>
                            <button
                                onClick={handleClear}
                                className="px-4 py-2 text-lg font-bold text-white bg-red-500 rounded-full hover:bg-red-600 transition-all flex items-center"
                            >
                                <XCircle className="mr-2" /> Clear
                            </button>
                        </div>
                        <p className="text-2xl font-bold text-white">Translation</p>
                    </div>
                </div>

                {audioSrc && (
                    <div className="flex justify-center mt-10">
                        <audio ref={audioRef} controls key={audioSrc} className="w-full max-w-lg">
                            <source src={audioSrc} type="audio/mp3" />
                        </audio>
                    </div>
                )}

                {savedTranslations.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-3xl font-bold text-white mb-6">Saved Translations</h2>
                        <div className="grid grid-cols-1 gap-6">
                            {savedTranslations.map((translation, index) => (
                                <div key={index} className="bg-white/80 p-6 rounded-3xl shadow-lg backdrop-blur-md relative">
                                    <p className="text-lg font-medium mb-4">{translation.text}</p>
                                    <audio
                                        controls
                                        className="w-full"
                                        volume={translation.volume}
                                    >
                                        <source src={translation.audio} type="audio/mp3" />
                                    </audio>
                                    <div className="flex items-center justify-between mt-4">
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={translation.volume}
                                            onChange={(e) => handleVolumeChange(index, e.target.value)}
                                            className="w-3/4"
                                        />
                                        <button
                                            onClick={() => handleDeleteTranslation(index)}
                                            className="ml-4 text-red-500 hover:text-red-700 transition-all"
                                        >
                                            <Trash2 size={24} />
                                        </button>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500">Saved at: {translation.time}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Home;
