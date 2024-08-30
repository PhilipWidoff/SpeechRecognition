# import whisper

# # Load the pre-trained Whisper model
# model = whisper.load_model("small")

# # Load the audio file and detect the language
# audio_file = "C:/Users/leons/Downloads/ttsMP3.com_VoiceText_2024-8-28_22-2-54.mp3"
# result = model.transcribe(audio_file, language=None)

# # Extract and print the detected language
# detected_language = result['language']
# print(f"The detected language is: {detected_language}")


# import pyaudio
# import whisper
# import numpy as np

# p = pyaudio.PyAudio()

# # Whisper model
# model = whisper.load_model("small")  # Load the base Whisper model

# # Stream parameters
# FORMAT = pyaudio.paInt16
# CHANNELS = 1
# RATE = 16000  # Whisper models are optimized for 16kHz
# CHUNK = 1024  # Number of frames per buffer

# # Open stream
# stream = p.open(format=FORMAT,
#                 channels=CHANNELS,
#                 rate=RATE,
#                 input=True,
#                 frames_per_buffer=CHUNK)

# print("Recording and detecting language in real-time...")

# try:
#     while True:
#         # Read audio chunk
#         audio_chunk = stream.read(CHUNK)

#         # Convert audio chunk to numpy array
#         audio_np = np.frombuffer(audio_chunk, dtype=np.int16).astype(np.float32) / 32768.0

#         # Run Whisper model on the audio
#         result = model.transcribe(audio_np, fp16=False, language=None)

#         detected_language = result['language']

#         # Print the detected language
#         print(f"Detected Language: {detected_language}")

# except KeyboardInterrupt:
#     print("Stopped recording.")

# finally:
#     # Stop and close the stream
#     stream.stop_stream()
#     stream.close()
#     p.terminate()





# Kör pip install openai-whisper och pip install pyaudio


import pyaudio
import whisper
import numpy as np

p = pyaudio.PyAudio()

model = whisper.load_model("small")

# Stream parameters
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
CHUNK = 1024

stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK)

print("Recording and detecting language in real-time...")

accumulated_audio = np.array([], dtype=np.float32)
seconds_to_accumulate = 5  # Collect 5 seconds of audio. We can change to give it more data to work with

try:
    while True:
        audio_chunk = stream.read(CHUNK)
        audio_np = np.frombuffer(audio_chunk, dtype=np.int16).astype(np.float32) / 32768.0
        accumulated_audio = np.concatenate((accumulated_audio, audio_np))

        if len(accumulated_audio) >= RATE * seconds_to_accumulate:
            result = model.transcribe(accumulated_audio, fp16=False, language=None)
            detected_language = result['language']
            print(f"Detected Language: {detected_language}")

            accumulated_audio = np.array([], dtype=np.float32)

except KeyboardInterrupt:
    print("Stopped recording.")

finally:
    stream.stop_stream()
    stream.close()
    p.terminate()
