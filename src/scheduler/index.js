import { logger } from 'killrvideo-nodejs-common';
import { loadSchedulesAsync } from './load-schedules';

export class Scheduler {
  constructor() {
    this._serverPromise = null;
  }

  start() {
    if (this._serverPromise !== null) {
      return;
    }

    logger.log('info', 'Starting scheduler');
    this._serverPromise = loadSchedulesAsync()
      .then(schedules => {
        logger.log('info', 'Schedules %j', schedules);
      })
      .tap(() => logger.log('info', 'Started scheduler'));
  }

  stop() {
    if (this._serverPromise === null) {
      return;
    }

    // Just cancel any existing promise
    logger.log('info', 'Stopping scheduler');
    this._serverPromise.cancel();
    logger.log('info', 'Stopped scheduler');
  }
};

export default Scheduler;