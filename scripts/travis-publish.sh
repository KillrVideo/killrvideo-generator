#!/bin/bash

# Only allow publish for tags
if [ -z "TRAVIS_TAG" ]; then
  echo "Current commit is not for a tag, skipping publish"
  exit 0
fi

set -xue # Print debug output, fail on empty env vars, exit on errors

DOCKER_IMAGE=killrvideo/killrvideo-generator

docker tag ${DOCKER_IMAGE}:${TRAVIS_COMMIT} ${DOCKER_IMAGE}:${TRAVIS_TAG}
docker login -u $DOCKER_USER -p $DOCKER_PASS
docker push ${DOCKER_IMAGE}:${CURRENT_TAG}
