#!/bin/bash
# Install FFmpeg
echo "Installing FFmpeg..."
apt-get update && apt-get install -y ffmpeg

# Check FFmpeg version
echo "FFmpeg version:"
ffmpeg -version

# Start your application
echo "Starting application..."
npm start
