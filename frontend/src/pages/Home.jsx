import React, { useState } from "react";

function Home() {
    const [recording, setRecording] = useState(false);

    const toggleRecording = () => {
        setRecording(!recording);
    };

    function RecordAudio() {
        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(function onSuccess(stream) {
                const recorder = new MediaRecorder(stream);

                const data = [];
                recorder.ondataavailable = (e) => {
                    data.push(e.data);
                };
                recorder.start();
                recorder.onerror = (e) => {
                    throw e.error || new Error(e.name); // e.name is FF non-spec
                };
                recorder.onstop = (e) => {
                    const audio = document.createElement("audio");
                    audio.src = window.URL.createObjectURL(new Blob(data));
                };
                setTimeout(() => {
                    rec.stop();
                }, 5000);
            })
            .catch(function onError(error) {
                console.log(error.message);
            });
    }

    return (
        <div className="bg-red-500 h-screen flex items-center">
            <button
                className="bg-green-500 min-w-96 min-h-72 mx-auto flex items-center justify-center text-4xl"
                onClick={toggleRecording}
            >
                {recording ? "STOP" : "PLAY"}
            </button>
        </div>
    );
}

export default Home;
