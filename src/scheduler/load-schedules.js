import Promise from 'bluebird';
import config from 'config';
import { parse } from 'later';
import { logger } from 'killrvideo-nodejs-common';

/**
 * Loads and parses the schedules from config. Returns an object with task names as the keys and an array 
 * of later.js schedules as the values.
 */
export function loadSchedules() {
  let tasksAndSchedules = config.get('schedules');

  return Object.keys(tasksAndSchedules).reduce((acc, taskName) => {
    let schedules = tasksAndSchedules[taskName];
    acc[taskName] = schedules.map(s => {
      let parsed = parse.text(s);
      if (parsed.error >= 0) {
        throw new Error(`Error parsing '${taskName}' schedule '${s}' at character ${parsed.error}`);
      }
      logger.log('verbose', 'Loaded task %s with schedule %s', taskName, s);
      return parsed;
    });
    return acc;
  }, {});
};

export default loadSchedules;