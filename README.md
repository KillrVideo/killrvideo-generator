# KillrVideo Sample Data Generator

[![Build Status](https://travis-ci.org/KillrVideo/killrvideo-generator.svg?branch=master)](https://travis-ci.org/KillrVideo/killrvideo-generator)

A NodeJS app that generates sample data for KillrVideo and adds it to the site. Uses the Grpc
clients for the KillrVideo microservices to call service methods and add sample data. Sample
data is added on regular scheduled intervals. Will watch the status of the Grpc services and
start/stop scheduled tasks based on the service availability.

This app is meant to be used by the various microservices implementations for KillrVideo. It
is packaged and distributed as a Docker container.
