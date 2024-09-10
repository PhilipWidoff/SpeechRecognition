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


# import pyaudio
# import whisper
# import numpy as np

# p = pyaudio.PyAudio()

# model = whisper.load_model("tiny")

# # Stream parameters
# FORMAT = pyaudio.paInt16
# CHANNELS = 1
# RATE = 16000
# CHUNK = 1024

# stream = p.open(format=FORMAT,
#                 channels=CHANNELS,
#                 rate=RATE,
#                 input=True,
#                 frames_per_buffer=CHUNK)

# print("Recording and detecting language in real-time...")

# accumulated_audio = np.array([], dtype=np.float32)
# seconds_to_accumulate = 5  # Collect 5 seconds of audio. We can change to give it more data to work with

# try:
#     while True:
#         audio_chunk = stream.read(CHUNK)
#         audio_np = np.frombuffer(audio_chunk, dtype=np.int16).astype(np.float32) / 32768.0
#         accumulated_audio = np.concatenate((accumulated_audio, audio_np))

#         if len(accumulated_audio) >= RATE * seconds_to_accumulate:
#             result = model.transcribe(accumulated_audio, fp16=False, language=None)
#             detected_language = result['language']
#             print(f"Detected Language: {detected_language}")

#             accumulated_audio = np.array([], dtype=np.float32)

# except KeyboardInterrupt:
#     print("Stopped recording.")

# finally:
#     stream.stop_stream()
#     stream.close()
#     p.terminate()


# import pyaudio
# import whisper
# import numpy as np
# import noisereduce as nr
# import torch

# # Check if CUDA or CPU is available
# device = "cuda" if torch.cuda.is_available() else "cpu"

# # Load Whisper model and move to appropriate device
# model = whisper.load_model("medium").to(device)

# # Stream parameters
# audio_format = pyaudio.paInt16
# num_channels = 1
# sample_rate = 16000
# buffer_size = 1024

# # Initialize PyAudio
# p = pyaudio.PyAudio()

# # Open stream
# stream = p.open(format=audio_format,
#                 channels=num_channels,
#                 rate=sample_rate,
#                 input=True,
#                 frames_per_buffer=buffer_size)

# print(f"Recording and detecting language with noise reduction in real-time (running on {device})...")

# # Set accumulation time to 5 seconds for better context
# seconds_to_accumulate = 5
# accumulated_audio = np.array([], dtype=np.float32)

# try:
#     while True:
#         # Capture and process audio in chunks
#         audio_chunk = stream.read(buffer_size)
#         audio_np = np.frombuffer(audio_chunk, dtype=np.int16).astype(np.float32) / 32768.0
#         accumulated_audio = np.concatenate((accumulated_audio, audio_np))

#         if len(accumulated_audio) >= sample_rate * seconds_to_accumulate:
#             # Apply noise reduction
#             reduced_noise_audio = nr.reduce_noise(y=accumulated_audio, sr=sample_rate)

#             # Ensure the audio is in float32 format
#             reduced_noise_audio = reduced_noise_audio.astype(np.float32)

#             # Use Whisper's transcribe method to automatically handle Mel spectrogram generation
#             result = model.transcribe(reduced_noise_audio, fp16=False, language=None)
#             detected_language = result['language']
#             print(f"Detected Language: {detected_language}")

#             # Reset accumulated audio for the next segment
#             accumulated_audio = np.array([], dtype=np.float32)

# except KeyboardInterrupt:
#     print("Stopped recording.")

# finally:
#     stream.stop_stream()
#     stream.close()
#     p.terminate()




import pyaudio
import whisper
import numpy as np
import noisereduce as nr
import torch


device = "cuda" if torch.cuda.is_available() else "cpu"

model = whisper.load_model("medium").to(device)

# Stream parameters
audio_format = pyaudio.paInt16
num_channels = 1
sample_rate = 16000
buffer_size = 1024

p = pyaudio.PyAudio()

# Open stream
stream = p.open(format=audio_format,
                channels=num_channels,
                rate=sample_rate,
                input=True,
                frames_per_buffer=buffer_size)

print(f"Recording and detecting language with optimal noise reduction in real-time (running on {device})...")


seconds_to_accumulate = 5
accumulated_audio = np.array([], dtype=np.float32)

# Optional: Collect a pre-estimated noise profile during the first 1 second
noise_profile = []

try:
    while True:
        # Capture and process audio in chunks
        audio_chunk = stream.read(buffer_size)
        audio_np = np.frombuffer(audio_chunk, dtype=np.int16).astype(np.float32) / 32768.0
        accumulated_audio = np.concatenate((accumulated_audio, audio_np))

        # Collect noise profile during the first second of recording
        if len(accumulated_audio) <= sample_rate:
            noise_profile.extend(audio_np)

        # Once enough audio is accumulated, apply noise reduction
        if len(accumulated_audio) >= sample_rate * seconds_to_accumulate:
            # Convert noise profile list to NumPy array
            noise_profile_np = np.array(noise_profile)

            # Apply noise reduction with custom parameters
            reduced_noise_audio = nr.reduce_noise(
                y=accumulated_audio, 
                sr=sample_rate,              
                prop_decrease=0.85,            
                n_fft=1024,                     
                stationary=False,               
                y_noise=noise_profile_np if len(noise_profile_np) > 0 else None  
            )

            # Ensure the audio is in float32 format
            reduced_noise_audio = reduced_noise_audio.astype(np.float32)

            result = model.transcribe(reduced_noise_audio, fp16=False, language=None)
            detected_language = result['language']
            print(f"Detected Language: {detected_language}")

            accumulated_audio = np.array([], dtype=np.float32)

except KeyboardInterrupt:
    print("Stopped recording.")

finally:
    stream.stop_stream()
    stream.close()
    p.terminate()
