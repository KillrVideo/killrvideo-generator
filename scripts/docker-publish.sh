#!/bin/bash

set -xu # Print debug output, fail on empty env vars

# This script assumes the following environment variables are present
#
#   DOCKER_USER=username
#   DOCKER_PASS=somesecretpassword
DOCKER_IMAGE=killrvideo/killrvideo-generator

set +e # Allow git describe to fail (which it will if this isn't a tagged commit)
CURRENT_TAG=`git describe --tags --exact-match 2> /dev/null`
set -e # Exit with nonzero exit code if anything fails

# Only allow publish for tags
if [ -z "$CURRENT_TAG" ]; then
  echo "Current commit is not for a tag, skipping publish"
  exit 0
fi

# Make sure we have a user/pass
if [[ -z "$DOCKER_USER" ]] || [[ -z "$DOCKER_PASS" ]]; then
  echo "DOCKER_USER or DOCKER_PASS not set"
  exit 1
fi

docker tag $DOCKER_IMAGE $CURRENT_TAG

echo "Publishing $DOCKER_IMAGE for git tag $CURRENT_TAG"

# Login to Docker and push the image which should have been built
set +x # Suppress credentials output. Travis CI promises to hide them but we should trust no one
docker login -u $DOCKER_USER -p $DOCKER_PASS
set -x # Bring back output
docker push $DOCKER_IMAGE:$CURRENT_TAG
