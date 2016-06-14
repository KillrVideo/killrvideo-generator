import Promise from 'bluebird';
import { readFile } from 'fs';
import { cwd } from 'process';
import { join } from 'path';
import { safeLoad } from 'js-yaml';
import { parse } from 'later';
import { logger } from 'killrvideo-nodejs-common';

// Create Promise version of readFile
const readFileAsync = Promise.promisify(readFile);

/**
 * Loads and parses the schedules.yaml file from the current working directory. Returns an object
 * with task names as the keys and an array of later.js schedules as the values.
 */
export function loadSchedulesAsync() {
  let filename = join(cwd(), 'schedules.yaml');
  return readFileAsync(filename, 'utf8')
    .then(data => {
      let yaml = safeLoad(data, { filename });
      return Object.keys(yaml).reduce((acc, taskName) => {
        let schedules = yaml[taskName];
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
    });
};

export default loadSchedulesAsync;