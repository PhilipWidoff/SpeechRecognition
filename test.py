import whisper
import pyaudio
import numpy as np
import noisereduce as nr
import tkinter as tk
from tkinter import messagebox
from googletrans import Translator
import threading
import torch
import time
from gtts import gTTS
import os
from playsound import playsound

# Whisper model loading
device = "cuda" if torch.cuda.is_available() else "cpu"
model = whisper.load_model("medium").to(device)

# Stream parameters
audio_format = pyaudio.paInt16
num_channels = 1
sample_rate = 16000
buffer_size = 1024
seconds_to_accumulate = 5  # Length of audio to accumulate before transcribing
silence_threshold = 0.02  # Amplitude threshold to detect silence
max_silence_time = 5  # Maximum time of silence before stopping recording

# Initialize PyAudio
p = pyaudio.PyAudio()

# Initialize Google Translate
translator = Translator()

# Global variables
accumulated_audio = np.array([], dtype=np.float32)
stop_recording = False
noise_profile = []
last_sound_time = None  # Track the last time sound was detected

# Function to handle real-time transcription, noise reduction, and translation
def process_audio_stream(transcription_text, translation_text):
    global stop_recording, accumulated_audio, noise_profile, last_sound_time

    # Open the stream
    stream = p.open(format=audio_format,
                    channels=num_channels,
                    rate=sample_rate,
                    input=True,
                    frames_per_buffer=buffer_size)

    accumulated_audio = np.array([], dtype=np.float32)
    noise_profile = []
    last_sound_time = time.time()
    paused = False  # To track if the system is paused

    transcription_text.insert(tk.END, "Recording started...\n")

    try:
        while not stop_recording:
            # Capture audio in chunks
            audio_chunk = stream.read(buffer_size)
            audio_np = np.frombuffer(audio_chunk, dtype=np.int16).astype(np.float32) / 32768.0
            accumulated_audio = np.concatenate((accumulated_audio, audio_np))

            # Detect if there's sound based on the amplitude of the audio signal
            if np.mean(np.abs(audio_np)) > silence_threshold:
                last_sound_time = time.time()  # Reset the last sound time if sound is detected
                if paused:  # If paused, resume the system
                    transcription_text.insert(tk.END, "Sound detected, resuming recording...\n")
                    paused = False

            # If no sound is detected for more than the max_silence_time, pause recording
            if time.time() - last_sound_time > max_silence_time and not paused:
                transcription_text.insert(tk.END, "No voice detected for 5 seconds, pausing recording...\n")
                paused = True

            # Continue processing if not paused
            if not paused:
                # Collect noise profile during the first second of recording
                if len(accumulated_audio) <= sample_rate:
                    noise_profile.extend(audio_np)

                # Once enough audio is accumulated, apply noise reduction and transcribe
                if len(accumulated_audio) >= sample_rate * seconds_to_accumulate:
                    # Convert noise profile list to NumPy array
                    noise_profile_np = np.array(noise_profile)

                    # Apply noise reduction
                    reduced_noise_audio = nr.reduce_noise(
                        y=accumulated_audio,
                        sr=sample_rate,
                        prop_decrease=0.85,
                        n_fft=1024,
                        stationary=False,
                        y_noise=noise_profile_np if len(noise_profile_np) > 0 else None
                    )

                    # Transcribe the reduced noise audio
                    result = model.transcribe(reduced_noise_audio, fp16=False, language=None)
                    detected_language = result['language']
                    transcribed_text = result['text']

                    # Display transcription result
                    transcription_text.insert(tk.END, f"Detected Language: {detected_language}\n")
                    transcription_text.insert(tk.END, f"Transcribed Text: {transcribed_text}\n")
                    transcription_text.see(tk.END)  # Scroll to the end

                    # Translate the text
                    target_language = "ar"  # Change this to your target language code
                    translated = translator.translate(transcribed_text, dest=target_language)
                    translated_text = translated.text

                    # Display translation result
                    translation_text.insert(tk.END, f"Translated Text ({target_language}): {translated_text}\n")
                    translation_text.see(tk.END)  # Scroll to the end

                    # Use gTTS to speak the translated text in the translated language
                    tts = gTTS(text=translated_text, lang=target_language)
                    tts.save("translated_audio.mp3")
                    playsound("translated_audio.mp3")
                    os.remove("translated_audio.mp3")

                    # Reset accumulated audio buffer for continuous listening
                    accumulated_audio = np.array([], dtype=np.float32)

    except Exception as e:
        messagebox.showerror("Error", f"An error occurred: {e}")
    finally:
        stream.stop_stream()
        stream.close()


# Function to start recording in a new thread
def start_recording(transcription_text, translation_text):
    global stop_recording
    stop_recording = False
    threading.Thread(target=process_audio_stream, args=(transcription_text, translation_text)).start()


# Function to stop recording
def stop_recording_func(transcription_text):
    global stop_recording
    stop_recording = True
    transcription_text.insert(tk.END, "Recording stopped.\n")


# Function to initialize the tkinter interface
def create_gui():
    root = tk.Tk()
    root.title("Real-Time Transcription and Translation")
    root.geometry("600x500")

    # Label
    label = tk.Label(root, text="Real-Time Transcription and Translation", font=("Helvetica", 16))
    label.pack(pady=10)

    # Transcription text box
    transcription_text = tk.Text(root, wrap=tk.WORD, height=10, width=70)
    transcription_text.pack(pady=10)

    # Translation text box
    translation_text = tk.Text(root, wrap=tk.WORD, height=10, width=70)
    translation_text.pack(pady=10)

    # Start and Stop buttons
    start_button = tk.Button(root, text="Start Recording", command=lambda: start_recording(transcription_text, translation_text))
    start_button.pack(pady=10)

    stop_button = tk.Button(root, text="Stop Recording", command=lambda: stop_recording_func(transcription_text))
    stop_button.pack(pady=10)

    root.mainloop()


# Run the tkinter interface
create_gui()
