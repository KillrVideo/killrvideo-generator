import Promise from 'bluebird';
import { Scheduler } from './scheduler';
import * as availableTasks from './tasks';

// Allow promise cancellation
Promise.config({ cancellation: true });

let s = new Scheduler(availableTasks);
s.start();
