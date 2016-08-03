import { logger } from 'killrvideo-nodejs-common';
import { loadSchedules } from './load-schedules';
import { createTaskExecutors } from './task-executor';

export class Scheduler {
  constructor() {
    this._running = false;
    this._runningTasks = null;
  }

  start() {
    if (this._running === true) {
      return;
    }

    logger.log('info', 'Starting scheduler');
    
    let scheduledTasks = loadSchedules();
    let taskExecutors = createTaskExecutors(scheduledTasks);
    taskExecutors.forEach(t => t.start());
    this._runningTasks = taskExecutors;

    logger.log('info', 'Started scheduler');
    this._running = true;
  }

  stop() {
    if (this._running === false) {
      return;
    }

    logger.log('info', 'Stopping scheduler');

    // Stop any running tasks
    if (this._runningTasks !== null) {
      this._runningTasks.forEach(t => t.stop());
    }

    // Reset state
    this._runningTasks = null;

    logger.log('info', 'Stopped scheduler');
    this._running = false;
  }
};

export default Scheduler;