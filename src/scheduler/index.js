import Promise from 'bluebird';
import { logger } from 'killrvideo-nodejs-common';
import { loadSchedules } from './load-schedules';
import { createTaskExecutors } from './task-executor';
import { ServicesMonitor, AvailableStates } from './services-monitor';

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
    while (true) {
      logger.log('verbose', 'SCHEDULED TASK');
      await Promise.delay(10000);
    }
  }
};

export default Scheduler;