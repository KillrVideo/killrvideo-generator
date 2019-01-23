#!/bin/bash

set -xue # Debug output, fail on an empty env variable, exit on error

docker build -t killrvideo/killrvideo-generator:`git log -1 --pretty=format:%h` --build-arg KILLRVIDEO_YOUTUBE_API_KEY=$KILLRVIDEO_YOUTUBE_API_KEY .
