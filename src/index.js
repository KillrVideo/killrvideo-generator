import Promise from 'bluebird';
import process from 'process';
import util from 'util';
import { withRetries } from 'killrvideo-nodejs-common';
import { Scheduler } from './scheduler';
import * as availableTasks from './tasks';
import { initCassandraAsync } from './utils/cassandra';

// Allow promise cancellation
Promise.config({ cancellation: true });

// Start the scheduler
function startScheduler() {
  let s = new Scheduler(availableTasks);
  s.start();
  return s;
}

// Initialize and start scheduler
let startPromise = withRetries(initCassandraAsync, 10, 10, 'Could not initialize Cassandra keyspace', false)
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
