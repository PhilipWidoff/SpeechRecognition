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

  const startRecording = async () => {
    if (recording) return;

    console.log("Attempting to connect to WebSocket");
    socketRef.current = new WebSocket("ws://192.168.15.253:8000/ws");

    socketRef.current.onopen = async () => {
      console.log("WebSocket connection established");
      const languageCode = languages.find(
        (lang) => lang.label === selectedLanguage
      ).code;
      console.log(`Sending target language: ${languageCode}`);
      socketRef.current.send(JSON.stringify({ target_language: languageCode }));

      try {
        console.log("Requesting media access");
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        console.log("Media access granted");

        mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, {
          mimeType: "audio/webm;codecs=opus",
          audioBitsPerSecond: 16000,
        });
        setRecording(true);

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (
            event.data.size > 0 &&
            socketRef.current.readyState === WebSocket.OPEN
          ) {
            console.log("Sending audio data to server");
            socketRef.current.send(event.data);
          }
        };

        mediaRecorderRef.current.start();

        recordingIntervalRef.current = setInterval(() => {
          if (mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.start();
          }
        }, 5000);
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

  const stopRecording = () => {
    if (!recording) return;

    console.log("Stopping recording");
    clearInterval(recordingIntervalRef.current);

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (socketRef.current) {
      socketRef.current.close();
    }

    setRecording(false);
    console.log("Recording stopped");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,#C9EBFF,transparent)] p-4 font-poppins">
      <div className="container mx-auto px-4 py-8 rounded-lg">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Real-Time Translation
        </h1>
        <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex flex-col items-center w-full md:w-1/2">
            <div className="w-3/4 flex justify-center mb-4">
              <button
                className="px-6 py-3 text-xl bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                onClick={toggleRecording}
              >
                {recording ? "STOP" : "START"}
              </button>
            </div>
            <div className="flex justify-center w-full">
              <div className="mb-2 px-4 py-2 bg-white rounded-lg shadow-md text-base w-1/3 text-center">
                <span className="font-semibold">Detected: </span>
                {detectedLanguage}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center w-full md:w-1/2">
            <div className="w-3/4 flex justify-center mb-4" ref={dropdownRef}>
              <div className="relative w-1/3">
                <button
                  onClick={toggleDropdown}
                  className="w-full flex items-center justify-between bg-white p-2 text-sm font-normal rounded-lg shadow-lg hover:bg-gray-100 transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  <span>{selectedLanguage}</span>
                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {isOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {languages.map((language, index) => (
                      <button
                        key={index}
                        onClick={() => handleLanguageSelect(language.label)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                      >
                        {language.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-center w-full">
              <div className="mb-2 px-4 py-2 bg-white rounded-lg shadow-md text-base w-1/3 text-center">
                <span className="font-semibold">Target: </span>
                {selectedLanguage}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-stretch space-y-4 md:space-y-0 md:space-x-4 mt-8">
          <div className="flex flex-col items-center w-full md:w-1/2">
            <div className="bg-white border-2 border-gray-300 rounded-lg w-3/4 h-72 p-4 overflow-auto shadow-inner">
              {currentDialogue}
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-800">
              Transcription
            </p>
          </div>

          <div className="flex flex-col items-center w-full md:w-1/2">
            <div className="bg-white border-2 border-gray-300 rounded-lg w-3/4 h-72 p-4 overflow-auto shadow-inner">
              {translatedText}
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-800">
              Translation
            </p>
          </div>
        </div>

        {audioSrc && (
          <div className="flex justify-center mt-8">
            <audio
              ref={audioRef}
              controls
              className="w-3/4 max-w-md"
              key={audioSrc}
            >
              <source src={audioSrc} type="audio/mp3" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;