import Promise from 'bluebird';
import process from 'process';
import util from 'util';
import { logger, withRetries, createKeyspaceIfNotExistsAsync } from 'killrvideo-nodejs-common';
import { Scheduler } from './scheduler';
import * as availableTasks from './tasks';

// Allow promise cancellation
Promise.config({ cancellation: true });

// Wait for Cassandra to become available and create the keyspace if necessary
function initCassandra() {
  return Promise.try(() => {
    // Hardcoded cassandra settings for now
    const keyspace = 'killrvideo_sample_data';
    const replication = "{ 'class' : 'SimpleStrategy', 'replication_factor' : 1 }";
    return createKeyspaceIfNotExistsAsync(keyspace, replication);
  })
  .catch(err => {
    logger.log('verbose', err.message);
    throw err;
  });
}

// Start the scheduler
function startScheduler() {
  let s = new Scheduler(availableTasks);
  s.start();
  return s;
}

// Initialize and start scheduler
let startPromise = withRetries(initCassandra, 10, 10, 'Could not initialize Cassandra keyspace', false)
  .then(startScheduler)
  .catch(err => {
    console.error('Unable to start KillrVideo Web Server');
    console.error(err);
    process.exitCode = 1;
  });

// Handler for attempting to gracefully shutdown
function onStop() {
  console.log('Attempting to shutdown');

  if (startPromise.isFulfilled()) {
    let s = startPromise.value();
    s.stop();
  } else {
    startPromise.cancel();
  }

  process.exit(0);
}

// Attempt to shutdown on SIGINT
process.on('SIGINT', onStop);
