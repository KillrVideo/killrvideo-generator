import Promise from 'bluebird';
import { readFile } from 'fs';
import { cwd } from 'process';
import { join } from 'path';
import { safeLoad } from 'js-yaml';
import { parse } from 'later';

// Create Promise version of readFile
const readFileAsync = Promise.promisify(readFile);

/**
 * Loads and parses the schedules.yaml file from the current working directory. Returns an object
 * with job names as the keys and an array of later.js schedules as the values.
 */
export function loadSchedulesAsync() {
  let filename = join(cwd(), 'schedules.yaml');
  return readFileAsync(filename, 'utf8')
    .then(data => {
      let yaml = safeLoad(data, { filename });
      return Object.keys(yaml).reduce((acc, jobName) => {
        let schedules = yaml[jobName];
        acc[jobName] = schedules.map(s => {
          let parsed = parse.text(s);
          if (parsed.error >= 0) {
            throw new Error(`Error parsing '${jobName}' schedule '${s}' at character ${parsed.error}`);
          }
          return parsed;
        });
        return acc;
      }, {});
    });
};

export default loadSchedulesAsync;