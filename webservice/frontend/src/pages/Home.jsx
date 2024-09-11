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

  // Language selection state
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const languages = [
    "English",
    "Spanish",
    "Mandarin",
    "French",
    "German",
    "Portuguese",
    "Russian",
    "Japanese",
    "Arabic",
    "Hindi",
    "Korean",
    "Italian",
    "Turkish",
    "Dutch",
    "Swedish",
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

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
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
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: "16000",
      });
      setRecording(true);
      console.log("Connected and recording");

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (
          event.data.size > 0 &&
          socketRef.current.readyState === WebSocket.OPEN
        ) {
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
        const data = JSON.parse(event.data);  // Parse the incoming JSON data
    
        // Access the transcription and detected language from the JSON
        setCurrentDialogue(data.transcription);  // Update the transcription text
        setDetectedLanguage(data.detected_language);  // Update the detected language
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

  const handleTTS = () => {
    console.log("TTS button clicked");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,#C9EBFF,transparent)] p-4">
      <div className="w-full max-w-4xl">
        <div className="flex justify-center items-start space-x-4">
          {/* Left column */}
          <div className="flex flex-col items-center w-5/12">
            <div className="w-full flex justify-center mb-4">
              <button
                className="px-6 py-3 text-xl bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition-colors"
                onClick={toggleRecording}
              >
                {recording ? "STOP" : "PLAY"}
              </button>
            </div>
            <div className="mb-2 px-4 py-2 bg-white rounded-lg shadow-md text-base w-1/2 text-center">
              <span className="font-semibold">Detected: </span>{detectedLanguage}
              
            </div>
            <div className="bg-gray-200 border-2 border-black rounded-lg w-full h-72 p-4 overflow-auto">
              {currentDialogue}
            </div>
            <p className="mt-2 text-2xl font-semibold text-black">
              Transcription
            </p>
          </div>

          {/* Language Selector */}
          <div
            className="w-2/12 flex flex-col items-center justify-start pt-8"
            ref={dropdownRef}
          >
            <div className="relative w-full">
              <button
                onClick={toggleDropdown}
                className="w-full flex items-center justify-between bg-white p-2 text-sm font-normal rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
              >
                <span>{selectedLanguage}</span>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {isOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {languages.map((language, index) => (
                    <button
                      key={index}
                      onClick={() => handleLanguageSelect(language)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                    >
                      {language}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col items-center w-5/12">
            <div className="w-full flex justify-center mb-4">
              <button
                className="px-6 py-3 text-xl bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-colors"
                onClick={handleTTS}
              >
                TTS
              </button>
            </div>
            <div className="mb-2 px-4 py-2 bg-transparent text-base w-full">
              &nbsp;
            </div>
            <div className="bg-gray-200 border-2 border-black rounded-lg w-full h-72 p-4 overflow-auto">
              {translatedText}
            </div>
            <p className="mt-2 text-2xl font-semibold text-black">
              Translation
            </p>
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;