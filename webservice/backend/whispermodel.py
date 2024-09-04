import whisper
import io
import wave

MINIMUM_SIZE_FOR_PROCESSING = 32000

model = whisper.load_model("tiny")


# async def process_audio(datastream):
# 
    # audio_buffer = io.BytesIO()
# 
    # async for message in datastream:
        # audio_buffer.write(message)
# 
        # if enough_data(audio_buffer):
            # wav_data = convert_to_wav(audio_buffer)
            # transcription = transcribe_audio(wav_data)
            # print(transcription)
# 
            # audio_buffer = io.BytesIO()
# 
            # return transcription
# 
# 
# def enough_data(buffer):
    # return buffer.tell() > MINIMUM_SIZE_FOR_PROCESSING
# 
# 
# def convert_to_wav(buffer):
    # buffer.seek(0)
    # with wave.open(io.BytesIO(), 'wb') as wf:
        # wf.setnchannels(1)  # Mono
        # wf.setsampwidth(2)  # Sample width in bytes
        # wf.setframerate(16000)  # Sampling rate
        # wf.writeframes(buffer.read())
    # Return the WAV data as a bytes-like object
    # return io.BytesIO(wf.readframes())
# 

# if __name__ == "__main__":
#     transcribe_audio()


class Transcriber:
    def __init__(self):
        self.dialogue = []

    async def process_audio():
        audio_buffer = io.BytesIO()

    def convert_to_wav(buffer):
        buffer.seek(0)
        with wave.open(io.BytesIO(), 'wb') as wf:
            wf.setnchannels(1)  # Mono
            wf.setsampwidth(2)  # Sample width in bytes
            wf.setframerate(16000)  # Sampling rate
            wf.writeframes(buffer.read())
        # Return the WAV data as a bytes-like object
        return io.BytesIO(wf.readframes())  

    def transcribe_audio(wav_data):
        result = model.transcribe(wav_data)
        return result["text"]
