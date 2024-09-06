import pyaudio
import whisper
import numpy as np
from googletrans import Translator
import pyttsx3
import time
import tkinter as tk
from threading import Thread

# Load the Whisper model
model = whisper.load_model("small").to("cuda")

# Initialize the Google Translate API
translator = Translator()

# Initialize the text-to-speech engine
tts_engine = pyttsx3.init()

# PyAudio stream parameters
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
CHUNK = 1024

# Initialize PyAudio
p = pyaudio.PyAudio()

# Open audio stream
stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK)

# GUI setup using Tkinter
root = tk.Tk()
root.title("Real-Time Transcription and Translation")

# Global variables to control pause and resume
is_paused = False  # Used to control whether transcription is paused
accumulated_audio = np.array([], dtype=np.float32)

# GUI elements
transcribed_text_label = tk.Label(root, text="Transcribed Text", font=("Helvetica", 12))
transcribed_text_label.pack()

transcribed_text_box = tk.Text(root, height=10, width=50, font=("Helvetica", 12))
transcribed_text_box.pack()

translated_text_label = tk.Label(root, text="Translated Text", font=("Helvetica", 12))
translated_text_label.pack()

translated_text_box = tk.Text(root, height=10, width=50, font=("Helvetica", 12))
translated_text_box.pack()

# Buttons for pause and resume
pause_button = tk.Button(root, text="Pause", font=("Helvetica", 12), command=lambda: set_pause(True))
pause_button.pack()

resume_button = tk.Button(root, text="Resume", font=("Helvetica", 12), command=lambda: set_pause(False))
resume_button.pack()

# Accumulate audio
seconds_to_accumulate = 5  # Collect 5 seconds of audio
target_language = "en"  # Specify the target language code, e.g., "es" for Spanish

# Function to control pause/resume
def set_pause(state):
    global is_paused
    is_paused = state
    if is_paused:
        print("Transcription paused.")
    else:
        print("Transcription resumed.")

def process_audio():
    global accumulated_audio, is_paused

    while True:
        if not is_paused:
            # Read the audio in chunks and accumulate
            audio_chunk = stream.read(CHUNK)
            audio_np = np.frombuffer(audio_chunk, dtype=np.int16).astype(np.float32) / 32768.0
            accumulated_audio = np.concatenate((accumulated_audio, audio_np))

            if len(accumulated_audio) >= RATE * seconds_to_accumulate:
                # Process the accumulated audio
                result = model.transcribe(accumulated_audio, fp16=False, language=None)
                detected_language = result['language']
                transcribed_text = result['text']

                # Clear accumulated audio buffer
                accumulated_audio = np.array([], dtype=np.float32)

                # Update transcribed text in the GUI
                transcribed_text_box.delete(1.0, tk.END)
                transcribed_text_box.insert(tk.END, transcribed_text)

                # Translate the transcribed text
                translated = translator.translate(transcribed_text, dest=target_language)
                translated_text = translated.text

                # Update translated text in the GUI
                translated_text_box.delete(1.0, tk.END)
                translated_text_box.insert(tk.END, translated_text)

                # Convert the translated text to speech
                tts_engine.say(translated_text)
                tts_engine.runAndWait()

# Run audio processing in a separate thread to avoid blocking the GUI
audio_thread = Thread(target=process_audio)
audio_thread.daemon = True
audio_thread.start()

# Run the Tkinter event loop
root.mainloop()

# Close the stream when done
stream.stop_stream()
stream.close()
p.terminate()
