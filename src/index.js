import Promise from 'bluebird';
import { Scheduler } from './scheduler';

// Allow promise cancellation
Promise.config({ cancellation: true });

let s = new Scheduler();
s.start();
