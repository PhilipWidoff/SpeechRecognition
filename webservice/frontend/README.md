# Welcome to our frontend

# Instructions
# 1. Setup remote GPU server
uvicorn remote_gpu_server:app --host 0.0.0.0 --port 8000
# Deploy the python script(s)

# 2. Run the server
ssh -L 8000:localhost:8000 user@your-ubuntu-server-ip

# Websocket URL in react ws://localhost:8000/ws


# Remember that this setup is primarily for development purposes. For production,
# you'd want a more robust and secure setup, possibly involving proper deployment
# of both frontend and backend to a GPU-enabled environment or using cloud-based
# speech-to-text services.