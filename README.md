# KillrVideo Sample Data Generator

[![Build Status](https://travis-ci.org/KillrVideo/killrvideo-generator.svg?branch=master)](https://travis-ci.org/KillrVideo/killrvideo-generator)

A NodeJS app that generates sample data for KillrVideo and adds it to the site. Uses the Grpc
clients for the KillrVideo microservices to call service methods and add sample data. Sample
data is added on regular scheduled intervals. Will watch the status of the Grpc services and
start/stop scheduled tasks based on the service availability.

This app is meant to be used by the various microservices implementations for KillrVideo. It
is packaged and distributed as a Docker container.


## Setting up a Development Environment

After cloning the repo, first install all dependencies:
```
> npm install
```
All environment dependencies can be spun up using `docker-compose` (i.e. Etcd and DataStax
Enterprise). First you need to generate a `.env` file that contains information about your
Docker environment.

In Windows, from a Powershell command prompt run:
```
PS> .\lib\killrvideo-docker-common\create-environment.ps1
```
Or on Mac/Linux, run:
```
> ./lib/killrvideo-docker-common/create-environment.sh
```
You can then start those dependencies with:
```
> docker-compose up -d
```

## Developing

There is a developer task included in the `package.json` scripts. You can run this task with:
```
> npm run watch
```
This will clean, do a build, and then watch and recompile source files on change. The main
entrypoint for the app will be `/dist/index.js` after the build which you can start with or
without a debugger attached. Source maps for the transpiled code are next to the output files
in `/dist`.

If using VS Code for development, the tasks checked into the repo under `/.vscode` should 
allow you to start the program with debugging using `F5`.

## Releasing

The app is released as a Docker image for consumption by the service project implementations.
We try to follow semantic versioning and also to tag all releases in Git. To release, first
version the project with `npm` by doing:
```
> npm version <specific_version | major | minor | patch | prerelease>
```
The `postversion` script will automatically push the newly created tag and any commits to the
Git repository. The `/scripts` directory contains the scripts necessary to build/publish the
Docker image. 

We use Travis CI for doing continuous integration builds and it will use those scripts to 
automatically publish any tagged Git commits to Docker Hub. You can, of course, manually
build and publish Docker images with those scripts as well.