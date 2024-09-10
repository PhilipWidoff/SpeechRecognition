import whisper
import tkinter as tk
from tkinter import filedialog, messagebox
from googletrans import Translator
import pyttsx3
import time
import os
import threading

# Set the environment variable for ffmpeg path (replace this with your correct path)
os.environ["PATH"] += os.pathsep + r"C:\ffmpeg-master-latest-win64-gpl-shared\bin"

# Load Whisper model
model = whisper.load_model("medium").to("cuda")

# Initialize Google Translate and pyttsx3
translator = Translator()
tts_engine = pyttsx3.init()

# Global variable to track if the process should stop
stop_process = False

# Function to process the audio file
def process_audio(audio_file_path):
    global stop_process
    start = time.time()
    stop_process = False  # Reset stop flag when starting

    try:
        # Load and preprocess the audio using Whisper's built-in method
        audio = whisper.load_audio(audio_file_path)
        mel = whisper.log_mel_spectrogram(audio).to(model.device)

        # Check if the process was stopped
        if stop_process:
            transcription_text.insert(tk.END, "Process was stopped.\n")
            return

        # Transcribe the audio
        result = model.transcribe(audio_file_path, fp16=True, language=None)
        detected_language = result['language']
        transcribed_text = result['text']
        end = time.time()

        # Update GUI with results
        transcription_text.insert(tk.END, f"Detected Language: {detected_language}\n")
        transcription_text.insert(tk.END, f"Transcribed Text: {transcribed_text}\n")

        # Check again if the process was stopped
        if stop_process:
            transcription_text.insert(tk.END, "Process was stopped.\n")
            return

        # Translate the transcribed text
        target_language = "sv"
        translated = translator.translate(transcribed_text, dest=target_language)
        translated_text = translated.text
        transcription_text.insert(tk.END, f"Translated Text ({target_language}): {translated_text}\n")

        # Convert the translated text to speech
        tts_engine.say(translated_text)
        tts_engine.runAndWait()

    except Exception as e:
        messagebox.showerror("Error", f"An error occurred: {e}")

# Function to select an audio file
def browse_file():
    file_path = filedialog.askopenfilename(filetypes=[("Audio Files", "*.mp3;*.wav")])
    if file_path:
        transcription_text.delete(1.0, tk.END)
        transcription_text.insert(tk.END, "Processing the audio file...\n")
        threading.Thread(target=process_audio, args=(file_path,)).start()

# Function to stop the audio processing
def stop_audio_processing():
    global stop_process
    stop_process = True
    transcription_text.insert(tk.END, "Stopping the process...\n")

# Set up the tkinter window
root = tk.Tk()
root.title("Audio Transcription and Translation")
root.geometry("600x400")

# Create a browse button
browse_button = tk.Button(root, text="Browse Audio File", command=browse_file)
browse_button.pack(pady=10)

# Create a stop button
stop_button = tk.Button(root, text="Stop", command=stop_audio_processing)
stop_button.pack(pady=10)

# Create a text widget to display transcription and translation results
transcription_text = tk.Text(root, wrap=tk.WORD, height=15, width=70)
transcription_text.pack(pady=10)

# Start the tkinter event loop
root.mainloop()
