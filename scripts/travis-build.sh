#!/bin/bash

set -xue # Debug output, fail on an empty env variable, exit on error

docker build -t killrvideo/killrvideo-generator:${TRAVIS_COMMIT} --build-arg KILLRVIDEO_YOUTUBE_API_KEY=$KILLRVIDEO_YOUTUBE_API_KEY .
