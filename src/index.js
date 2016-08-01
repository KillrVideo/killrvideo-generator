import Promise from 'bluebird';
import process from 'process';
import util from 'util';
import { withRetries } from 'killrvideo-nodejs-common';
import { Scheduler } from './scheduler';
import * as availableTasks from './tasks';
import { initCassandraAsync } from './utils/cassandra';
import { refreshAllSourcesAsync } from './youtube/sources';
import { initializeSampleDataAsync } from './sample-data/initialize';

// Allow promise cancellation
Promise.config({ cancellation: true });

/**
 * Async start the application.
 */
async function startAsync() {
  let scheduler = null;

  try {
    // Make sure C* is ready to go
    await withRetries(initCassandraAsync, 10, 10, 'Could not initialize Cassandra keyspace', false);

    // Initialize sample data
    await initializeSampleDataAsync();

    // Refresh YouTube data sources
    await refreshAllSourcesAsync();

    // Start scheduled tasks
    scheduler = new Scheduler(availableTasks);
    scheduler.start();
    return scheduler;
  } catch (err) {
    if (scheduler !== null) scheduler.stop();

    console.error('Unable to start Sample Data Generator');
    console.error(err);
    process.exitCode = 1;
  }
}

// Start the app
let startPromise = startAsync();

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
