#!/bin/bash

set -xue # Print debug output, fail on empty env vars, exit on errors

# This script assumes the following environment variables are present
if [[ -z "$DOCKER_USER" ]] || [[ -z "$DOCKER_PASS" ]]; then
  echo "DOCKER_USER or DOCKER_PASS not set"
  exit 1
fi

DOCKER_IMAGE=killrvideo/killrvideo-generator
TAGHASH=`git log -1 --pretty=format:%h`
set +e; CURRENT_TAG=`git describe --tags --exact-match 2> /dev/null`; set -e

# Only allow publish for tags
if [ -z "$CURRENT_TAG" ]; then
  echo "Current commit is not for a tag, skipping publish"
  exit 0
fi

docker tag ${DOCKER_IMAGE}:${TAGHASH} ${DOCKER_IMAGE}:${CURRENT_TAG}

echo "Publishing $DOCKER_IMAGE for git tag $CURRENT_TAG"

# Login to Docker and push the image which should have been built
docker login -u $DOCKER_USER -p $DOCKER_PASS
docker push ${DOCKER_IMAGE}:${CURRENT_TAG}
