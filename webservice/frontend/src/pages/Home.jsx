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
  const [audio, setAudio] = useState(null);  // Manage audio playback state

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
    setIsOpen(false);

    // Send the language change control message without stopping recording
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const languageCode = languages.find((lang) => lang.label === language).code;
      socketRef.current.send(JSON.stringify({
        type: "control",
        action: "change_language",
        target_language: languageCode
      }));
    }
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
      const languageCode = languages.find((lang) => lang.label === selectedLanguage).code;
      socketRef.current.send(JSON.stringify({
        type: "control",
        action: "change_language",
        target_language: languageCode
      }));

      try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, {
          mimeType: "audio/webm;codecs=opus",
          audioBitsPerSecond: 16000,
        });
        setRecording(true);

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0 && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(event.data);
          }
        };

        mediaRecorderRef.current.start();

        // Send audio chunks every second without stopping the recorder
        recordingIntervalRef.current = setInterval(() => {
          if (mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.requestData();  // Request data without stopping the recorder
          }
        }, 1000);  // Sending chunks every second
      } catch (err) {
        console.error("Error accessing microphone:", err);
      }
    };

    socketRef.current.addEventListener("message", async (event) => {
      const data = JSON.parse(event.data);

      setCurrentDialogue(data.transcription);
      setDetectedLanguage(data.detected_language);
      setTranslatedText(data.translation);

      if (data.tts_audio) {
        const binaryString = window.atob(data.tts_audio);
        const binaryData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          binaryData[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([binaryData], { type: "audio/mp3" });
        const url = URL.createObjectURL(blob);
        setAudioSrc(url);

        // Stop the current audio if it's playing
        if (audio) {
          audio.pause();
          setAudio(null);
        }

        // Auto-play the audio after receiving TTS
        const newAudio = new Audio(url);
        newAudio.play();
        setAudio(newAudio);  // Store the new audio instance
      }
    });

    socketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      stopRecording();
    };

    socketRef.current.onclose = () => {
      stopRecording();
    };
  };

  const stopRecording = () => {
    if (!recording) return;

    clearInterval(recordingIntervalRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (socketRef.current) {
      socketRef.current.close();
    }

    setRecording(false);
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">Real-time Speech Translation</h1>

      <div className="flex items-center mb-8">
        <button
          className={`px-6 py-3 text-white rounded-lg font-semibold ${recording ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
          onClick={toggleRecording}
        >
          {recording ? "Stop Recording" : "Start Recording"}
        </button>

        <div className="relative ml-4">
          <button
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold flex items-center"
            onClick={toggleDropdown}
          >
            {selectedLanguage}
            {isOpen ? <ChevronUp className="ml-2" /> : <ChevronDown className="ml-2" />}
          </button>

          {isOpen && (
            <ul className="absolute bg-white border rounded-lg shadow-lg mt-2 w-full">
              {languages.map((lang) => (
                <li
                  key={lang.code}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleLanguageSelect(lang.label)}
                >
                  {lang.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="w-full max-w-3xl">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Transcription:</h2>
        <p className="p-4 bg-white rounded-lg shadow-md mb-4">{currentDialogue || "No transcription yet..."}</p>

        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Detected Language:</h2>
        <p className="p-4 bg-white rounded-lg shadow-md mb-4">{detectedLanguage || "No language detected..."}</p>

        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Translated Text:</h2>
        <p className="p-4 bg-white rounded-lg shadow-md mb-4">{translatedText || "No translation yet..."}</p>

        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Audio Playback:</h2>
        {audioSrc && <audio src={audioSrc} controls className="w-full" />}
      </div>
    </div>
  );
}

export default Home;
