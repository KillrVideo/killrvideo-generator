import Promise from 'bluebird';
import { AggregateError } from './aggregate-error';
import { logger } from './logging';

/**
 * Do a promise returning function with retries.
 */
export function withRetries(promiseFn, maxRetries, delaySeconds, errMsg, expBackoff) {
  let retryCount = 0;
  
  function doIt() {
    return promiseFn().catch(err => {
      // If we've hit the max, just propagate the error
      if (retryCount >= maxRetries) {
        throw err;
      }
      
      // Calculate delay time in MS
      let delayMs = expBackoff === true
        ? Math.pow(delaySeconds, retryCount) * 1000
        : delaySeconds * 1000;
      
      // Log, delay, and try again
      retryCount++;
      
      logger.log('debug', '', err);
      if (err instanceof AggregateError) {
        logger.log('debug', 'Inner errors:');
        err.innerErrors.forEach(innerError => {
          logger.log('debug', '', innerError);
        });
      }

      logger.log('verbose', `${errMsg}. Retry ${retryCount} in ${delayMs}ms.`);
      return Promise.delay(delayMs).then(doIt);
    });
  }
  
  return doIt();
};

/**
 * Similar to Promise.all except that it waits for all Promises to be resolved or rejected
 * before the Promise returned also resolves or rejects.
 */
export function whenAll(promises) {
  let reflectPromises = promises.map(p => p.reflect());
  return Promise.all(reflectPromises)
    .then(inspections => {
      // Take all promise inspection objects and get values/reasons
      let { values, reasons } = inspections.reduce((acc, inspection) => {
        if (inspection.isFulfilled()) {
          acc.values.push(inspection.value());
        } else {
          acc.reasons.push(inspection.reason());
        }
        return acc;
      }, { values: [], reasons: [] });

      // Throw an error or return the values
      if (reasons.length > 0) {
        throw new AggregateError(reasons);
      }
      return values;
    });
};