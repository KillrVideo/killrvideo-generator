import { logger } from 'killrvideo-nodejs-common';
import { loadSchedulesAsync } from './load-schedules';
import { createTaskExecutors } from './task-executor';

export class Scheduler {
  constructor(availableTasks) {
    if (!availableTasks) {
      throw new Error('No tasks supplied');
    }

    this._availableTasks = availableTasks;

    this._running = false;
    this._initPromise = null;
    this._runningTasks = null;
  }

  start() {
    if (this._running === true) {
      return;
    }

    logger.log('info', 'Starting scheduler');
    this._initPromise = loadSchedulesAsync()
      .then(scheduledTasks => {
        let taskExecutors = createTaskExecutors(this._availableTasks, scheduledTasks);
        taskExecutors.forEach(t => t.start());
        this._runningTasks = taskExecutors;
        logger.log('info', 'Started scheduler');
        this._running = true;
      })
      .catch(err => {
        // Use console to synchronously log the error to make sure it makes it to the console
        console.error('Failed to start the scheduler');
        console.error(err);
        process.exitCode = 1;
      });
  }

  stop() {
    if (this._running === false) {
      return;
    }

    logger.log('info', 'Stopping scheduler');

    // Cancel init if still in progress
    this._initPromise.cancel();

    // Stop any running tasks
    if (this._runningTasks !== null) {
      this._runningTasks.forEach(t => t.stop());
    }

    // Reset state
    this._initPromise = null;
    this._runningTasks = null;

    logger.log('info', 'Stopped scheduler');
    this._running = false;
  }
};

export default Scheduler;