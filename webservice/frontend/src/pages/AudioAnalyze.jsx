import React, { useState, useRef, useEffect } from "react";

function AudioAnalyze() {
    const [recording, setRecording] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const rafIdRef = useRef(null);

    const toggleRecording = () => {
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            audioContextRef.current = new AudioContext();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            const bufferLength = analyserRef.current.frequencyBinCount;
            dataArrayRef.current = new Uint8Array(bufferLength);
            source.connect(analyserRef.current);
            analyzeAudio();
            setRecording(true);
        } catch (err) {
            console.error("Error accessing microphone", err);
        }
    };

    const analyzeAudio = () => {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const maxLevel = Math.max(...dataArrayRef.current);
        console.log(maxLevel)
        setAudioLevel(maxLevel);
        rafIdRef.current = requestAnimationFrame(analyzeAudio);
    };

    const stopRecording = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        cancelAnimationFrame(rafIdRef.current);
        setRecording(false);
        setAudioLevel(0);
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
        <div className="flex items-center h-screen bg-red-500">
            <div className="flex justify-evenly items-center mx-auto w-[1280px]">
                <button
                    className="flex items-center justify-center text-4xl bg-green-500 rounded-lg shadow-md shadow-black w-96 h-72"
                    onClick={toggleRecording}
                >
                    {recording ? "STOP" : "PLAY"}
                </button>
                {/* <div className="mt-10 bg-gray-300 w-72 h-72">
                    <div className="h-full bg-green-500" style={{ height: `${audioLevel / 2}%` }}></div>
                </div> */}
            </div>
        </div>
    );
}

export default AudioAnalyze;
