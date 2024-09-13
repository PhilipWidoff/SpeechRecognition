import React, { useRef, useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

function Home() {
  const [recording, setRecording] = useState(false);
  const socketRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const [currentDialogue, setCurrentDialogue] = useState("");
  const [translatedText, setTranslatedText] = useState(""); // Translation state
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [audioSrc, setAudioSrc] = useState(""); // To store and play TTS audio
  const [selectedLanguage, setSelectedLanguage] = useState("English"); // Initialize selectedLanguage with a default value
  const [isOpen, setIsOpen] = useState(false); // Manage dropdown open state
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

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language); // Set the selected language
    setIsOpen(false);

    // Reset WebSocket connection when language changes
    if (recording) {
      stopRecording();      // Stop current recording and WebSocket
      startRecording();     // Start recording with the new language
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

    // Open new WebSocket connection
    socketRef.current = new WebSocket("ws://localhost:8000/ws");

    socketRef.current.onopen = async () => {
      const languageCode = languages.find((lang) => lang.label === selectedLanguage).code;
      socketRef.current.send(JSON.stringify({ target_language: languageCode })); // Send the selected language to the server

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

      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 5000); // Stop recording every 5 seconds to send audio chunks
    };

    // WebSocket message listener for real-time translation and TTS
    socketRef.current.addEventListener("message", async (event) => {
      const data = JSON.parse(event.data); // Parse the incoming JSON data

      setCurrentDialogue(data.transcription); // Update the transcription text
      setDetectedLanguage(data.detected_language); // Update the detected language
      setTranslatedText(data.translation); // Update the translated text

      // If TTS audio is provided, play it
      if (data.tts_audio) {
        const binaryString = window.atob(data.tts_audio);
        const binaryData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          binaryData[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([binaryData], { type: "audio/mp3" });
        const url = URL.createObjectURL(blob);
        setAudioSrc(url);  // Set the audio source for the player
      }
    });

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

    recordingIntervalRef.current = null;
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    socketRef.current = null;

    setRecording(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-4xl">
        <div className="flex justify-center items-start space-x-4">
          <div className="flex flex-col items-center w-5/12">
            <div className="w-full flex justify-center mb-4">
              <button
                className="px-6 py-3 text-xl bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600"
                onClick={toggleRecording}
              >
                {recording ? "STOP" : "PLAY"}
              </button>
            </div>
            <div className="mb-2 px-4 py-2 bg-white rounded-lg shadow-md text-base w-1/2 text-center">
              <span className="font-semibold">Detected: </span>
              {detectedLanguage}
            </div>
            <div className="bg-gray-200 border-2 border-black rounded-lg w-full h-72 p-4 overflow-auto">
              {currentDialogue}
            </div>
            <p className="mt-2 text-2xl font-semibold">Transcription</p>
          </div>

          <div className="w-2/12 flex flex-col items-center justify-start pt-8" ref={dropdownRef}>
            <div className="relative w-full">
              <button
                onClick={toggleDropdown}
                className="w-full flex items-center justify-between bg-white p-2 text-sm font-normal rounded-lg shadow-lg hover:bg-gray-100"
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
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                    >
                      {language.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center w-5/12">
            {audioSrc && (
              <audio controls autoPlay>
                <source src={audioSrc} type="audio/mp3" />
              </audio>
            )}

            <p className="mt-2 text-2xl font-semibold">Translation</p>
            <div className="bg-gray-200 border-2 border-black rounded-lg w-full h-72 p-4 overflow-auto">
              {translatedText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
