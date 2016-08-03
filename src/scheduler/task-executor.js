import Promise from 'bluebird';
import { setTimeout as setScheduledTimeout } from 'later';
import { withRetries, logger } from 'killrvideo-nodejs-common';
import * as availableTasks from '../tasks';

/**
 * Create a promise that will resolve at the next scheduled run time of a given later.js schedule.
 */
function createSchedulePromise(schedule) {
  // Use onCancel handler to support cancellation while we're waiting for the timeout
  return new Promise(function resolveOnSchedule(resolve, reject, onCancel) {
    var timer = setScheduledTimeout(resolve, schedule);
    onCancel(() => timer.clear());
  });
}

/**
 * Class to represent a running task and its associated state. Can be started/stopped.
 */
export class TaskExecutor {
  constructor(taskName, task, schedule) {
    this._taskName = taskName;
    this._task = Promise.method(task);  // TODO: Remove, temporary wrap with Promise.method to handle synchronous throwing
    this._schedule = schedule;
    this._promise = null;
  }

  start() {
    if (this._promise !== null) return;
    this._runNext();
  }

  stop() {
    if (this._promise === null) return;
    this._promise.cancel();
    this._promise = null;
  }

  _runNext() {
    this._promise = createSchedulePromise(this._schedule)
      .bind(this)
      .then(this._exec)
      .then(this._runNext);
  }

  _exec() {
    // Execute the task function with retries and an exponential backoff of 2 seconds
    return withRetries(this._task, 10, 2, `Error running ${this._taskName}`, true)
      .catch(err => {
        logger.log('error', `Task ${this._taskName} did not successfully execute after 10 retries.`, err);
      });
  }
}

/**
 * Given an object with available tasks and an object with task schedules, creates TaskExecutor objects
 * for each scheduled task and returns the array.
 */
export function createTaskExecutors(scheduledTasks) {
  // Reduce list of scheduled tasks down to an array of TaskExecutor objects
  return Object.keys(scheduledTasks).reduce((acc, taskName) => {
    // Make sure we know how to execute the task (i.e. we have a function for it)
    let task = availableTasks[taskName];
    if (!task) {
      throw new Error(`Could not find a task named ${taskName} in available tasks`);
    }

    // Get the array of schedules and map it
    let runningTasks = scheduledTasks[taskName].map(schedule => new TaskExecutor(taskName, task, schedule));
    Array.prototype.push.apply(acc, runningTasks);
    return acc;
  }, []);
};