import Promise from 'bluebird';
import process from 'process';
import config from 'config';
import { withRetries, setLoggingLevel, logger } from 'killrvideo-nodejs-common';
import { Scheduler } from './scheduler';
import { initCassandraAsync } from './utils/cassandra';
import { initializeSampleDataAsync } from './sample-data/initialize';

// Allow promise cancellation
Promise.config({ cancellation: true });

// Set default logging level based on config
let loggingLevel = config.get('loggingLevel');
setLoggingLevel(loggingLevel);
logger.log(loggingLevel, `Logging initialized at ${loggingLevel}`);

/**
 * Async start the application.
 */
async function startAsync() {
  let scheduler = null;

  try {
    // Make sure C* is ready to go
    await withRetries(initCassandraAsync, 10, 10, 'Could not initialize Cassandra keyspace', false);

    // Initialize sample data
    await withRetries(initializeSampleDataAsync, 10, 10, 'Could not initialize sample data', false);

    // Start scheduled tasks
    scheduler = new Scheduler();
    scheduler.start();
    return scheduler;
  } catch (err) {
    if (scheduler !== null) scheduler.stop();

    console.error('Unable to start Sample Data Generator');
    console.error(err);
    process.exit(1);
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
