import Promise from 'bluebird';
import { setTimeout as setScheduledTimeout } from 'later';
import { logger, whenAll, AggregateError } from 'killrvideo-nodejs-common';
import { loadSchedules } from './load-schedules';
import { ServicesMonitor, AvailableStates } from './services-monitor';
import { initializeSampleDataAsync } from '../sample-data/initialize';
import * as availableTasks from '../tasks';

export class Scheduler {
  constructor() {
    this._running = false;

    this._monitor = new ServicesMonitor();
    this._monitor.on('change', newState => this._handleServiceStatusChange(newState));
    this._runningPromise = null;
  }

  start() {
    if (this._running === true) return;

    logger.log('info', 'Starting scheduler');

    // Start listening for events and let those drive starting up scheduled tasks
    this._monitor.start();
    
    logger.log('info', 'Started scheduler');
    this._running = true;
  }

  stop() {
    if (this._running === false) return;
    
    logger.log('info', 'Stopping scheduler');

    // Stop listening for events and stop anything running
    this._monitor.stop();
    this._stopImpl(true);

    logger.log('info', 'Stopped scheduler');
    this._running = false;
  }

  _handleServiceStatusChange(newState) {
    switch(newState) {
      case AvailableStates.UNKNOWN:
      case AvailableStates.DOWN:
        this._stopImpl(false);
        break;
      case AvailableStates.UP:
        this._startImpl();
        break;
      default:
        throw new Error(`Unknown state ${newState}`);
    }
  }

  _startImpl() {
    if (this._runningPromise !== null) return;

    logger.log('verbose', 'Services available, starting scheduled tasks');
    this._runningPromise = this._runAsync();
  }

  _stopImpl(schedulerStopped) {
    // If no running promise, nothing to do
    if (this._runningPromise === null) return;
    
    let reason = schedulerStopped ? 'Scheduler stopped' : 'Services unavailable';
    logger.log('verbose', `${reason}, stopping scheduled tasks`);

    // Cancel promise and reset
    this._runningPromise.cancel();
    this._runningPromise = null;
  }

  async _runAsync() {
    // Run forever and allow stop via Promise cancellation
    while (true) {
      try {
        // Make sure we've got initial sample data before we start tasks
        await initializeSampleDataAsync();

        // Load all the schedules
        let schedules = loadSchedules();

        // Run scheduled tasks
        let taskPromises = Object.keys(schedules).reduce((acc, taskName) => {
          schedules[taskName].forEach(schedule => {
            acc.push(this._runTaskAsync(taskName, schedule));
          })
          return acc;
        }, []);

        await whenAll(taskPromises);
      } catch (err) {
        logger.log('error', '', err);
        if (err instanceof AggregateError) {
          logger.log('error', 'Inner errors:');
          err.innerErrors.forEach(innerErr => logger.log('error', '', innerErr));
        }
      }

      // Wait before trying again
      await Promise.delay(10000);
    }
  }

  async _runTaskAsync(taskName, schedule) {
    // Run forever until cancelled
    while (true) {
      try {
        await createSchedulePromise(schedule);
        let taskFn = availableTasks[taskName];
        if (!taskFn) {
          throw new Error(`No available task named ${taskName} was found.`);
        }
        await taskFn();
        logger.log('debug', `Ran ${taskName}`);
      } catch (err) {
        logger.log('error', `Error while running task ${taskName}.`, err);
      }
    }
  }
};

/**
 * Create a promise that will resolve at the next scheduled run time of a given later.js schedule.
 */
function createSchedulePromise(schedule) {
  // Use onCancel handler to support cancellation while we're waiting for the timeout
  return new Promise(function resolveOnSchedule(resolve, reject, onCancel) {
    let timer = setScheduledTimeout(resolve, schedule);
    onCancel(() => timer.clear());
  });
}

export default Scheduler;