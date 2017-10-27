# KillrVideo Sample Data Generator

[![Build Status](https://travis-ci.org/KillrVideo/killrvideo-generator.svg?branch=master)](https://travis-ci.org/KillrVideo/killrvideo-generator)

A NodeJS app that generates sample data for KillrVideo and adds it to the site. Uses the Grpc
clients for the KillrVideo microservices to call service methods and add sample data. Sample
data is added on regular scheduled intervals. Will watch the status of the Grpc services and
start/stop scheduled tasks based on the service availability.

This app is packaged and distributed as a Docker container. The typical usage is to download one of the KillrVideo microservice implementation projects, which contain configurations for starting the generator and infrastructure using docker-compose. For this reason, most users of KillrVideo won't need to clone this repo unless you need to modify the generator.

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

### Getting a YouTube API Key

The app generates sample video data to insert into KillrVideo by searching YouTube for videos matching keywords specified in `src/youtube/sources.js`. Calling the YouTube Data API requires  authentication, which for the generator is an API key. In order to run the generator from your local environment you will need to get an API key from the [Google Developer Console](https://console.developers.google.com/). 

Create a new project, select it, and expand APIs and Auth. In the list of APIs, enable YouTube Data API (v3) and under credentials select to create a new browser key. Now create the file `config/local.yaml` and add your API key:
 ```
youTubeApiKey: <YOUR API KEY> 
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

The app is released as a Docker image for use with the service project implementations.
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