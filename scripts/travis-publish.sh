#!/bin/bash

set -e # Exit with nonzero exit code if anything fails

# This script assumes the following environment variables are present
#
#   DOCKER_USER=some@email.com
#   DOCKER_PASS=somesecretpassword

SOURCE_BRANCH=master
DOCKER_IMAGE=luketillman/killrvideo-generator

# If a pull request, not for the source branch, or not a build for a tag, don't publish
if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then 
  echo "Skipping publish for pull request"
  exit 0
fi

if [ "$TRAVIS_BRANCH" != "$SOURCE_BRANCH" ]; then
  echo "Skipping publish for branch $TRAVIS_BRANCH"
  exit 0
fi

if [ -z "$TRAVIS_TAG" ]; then
  echo "Skipping publish for non-tag build"
  exit 0
fi

# Make sure we have a user/pass
if [[ -z "$DOCKER_USER" ]] || [[ -z "$DOCKER_PASS" ]]; then
  echo "DOCKER_USER or DOCKER_PASS not set"
  exit 1
fi

echo "Publishing $DOCKER_IMAGE for git tag $TRAVIS_TAG"

# Login to Docker and push the image which should have been built
docker login -u $DOCKER_USER -p $DOCKER_PASS
docker push $DOCKER_IMAGE