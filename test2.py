import whisper
from googletrans import Translator
import pyttsx3
import time
import os


os.environ["PATH"] += os.pathsep + r"C:\ffmpeg-master-latest-win64-gpl-shared\bin"
# Load the Whisper model
model = whisper.load_model("medium").to("cuda")
start = time.time()

# Initialize the Google Translate API
translator = Translator()

# Initialize the text-to-speech engine
tts_engine = pyttsx3.init()

# Path to the audio file
audio_file_path = "ttsMP3.com_VoiceText_2024-9-6_11-0-26.mp3"  # Specify your audio file path here

# Load and preprocess the audio using Whisper's built-in method
audio = whisper.load_audio(audio_file_path)


# Convert the audio to the correct format for the Whisper model
mel = whisper.log_mel_spectrogram(audio).to(model.device)

print("Processing the audio file...")

# Transcribe the loaded audio using Whisper
result = model.transcribe(audio_file_path, fp16=True, language=None)
detected_language = result['language']
transcribed_text = result['text']
end = time.time()
print(f"Detected Language: {detected_language}")
print(f"Transcribed Text: {transcribed_text}")
print(f"time elapsed: {end-start} seconds")

# Specify the target language code, e.g., "en" for English or "es" for Spanish
target_language = "en"

# Translate the transcribed text
translated = translator.translate(transcribed_text, dest=target_language)
translated_text = translated.text
print(f"Translated Text ({target_language}): {translated_text}")

# Convert the translated text to speech
tts_engine.say(translated_text)
tts_engine.runAndWait()
