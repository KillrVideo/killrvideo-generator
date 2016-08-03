import Promise from 'bluebird';
import process from 'process';
import config from 'config';
import { setLogger } from 'grpc';
import { withRetries, setLoggingLevel, logger } from 'killrvideo-nodejs-common';
import { Scheduler } from './scheduler';
import { initCassandraAsync } from './utils/cassandra';

// Allow promise cancellation
Promise.config({ cancellation: true });

/**
 * Async start the application.
 */
async function startAsync() {
  // Set default logging level based on config
  let loggingLevel = config.get('loggingLevel');
  setLoggingLevel(loggingLevel);
  logger.log(loggingLevel, `Logging initialized at ${loggingLevel}`);

  // Set Grpc to log via main logger with all messages at debug level
  setLogger({
    error(msg) {
      logger.log('debug', msg);
    }
  });

  let scheduler = null;

  try {
    // Make sure C* is ready to go
    await withRetries(initCassandraAsync, 10, 10, 'Could not initialize Cassandra keyspace', false);

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
