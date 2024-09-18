import React from 'react';

function About() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">About Our Project</h1>
      <div className="max-w-2xl mx-auto">
        <p className="mb-4">
          Our project aims to make communication easier across language barriers. We utilize cutting-edge technologies to provide real-time translation services:
        </p>
        <ul className="list-disc list-inside mb-4">
          <li className="mb-2"><strong>Whisper:</strong> For accurate speech recognition and transcription. Whisper is an automatic speech recognition (ASR) system trained on a large dataset of diverse audio, enabling it to transcribe speech with high accuracy across many languages and accents.</li>
          <li className="mb-2"><strong>Google Translate:</strong> To provide high-quality translations between languages. Google Translate uses advanced machine learning techniques to deliver fast and accurate translations for a wide range of language pairs.</li>
          <li className="mb-2"><strong>Google Text-to-Speech:</strong> To convert translated text into natural-sounding speech. This technology uses deep learning models to generate human-like speech in various languages and voices.</li>
        </ul>
        <p className="mb-4">
          By combining these powerful tools, we've created a seamless experience for users to communicate effectively, regardless of their native language. Our application processes speech in real-time, transcribes it, translates the text, and then converts it back to speech in the target language.
        </p>
        <p>
          Whether you're traveling abroad, conducting international business, or simply chatting with friends from different parts of the world, our tool helps break down language barriers and fosters better understanding between people of diverse linguistic backgrounds.
        </p>
      </div>
    </div>
  );
}

export default About;