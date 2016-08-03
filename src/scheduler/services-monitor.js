import EventEmitter from 'events';
import Promise from 'bluebird';
import { getGrpcClientAsync, logger } from 'killrvideo-nodejs-common';
import { getClientChannel } from 'grpc';
import grpc from 'grpc/src/node/src/grpc_extension.js';
import { VIDEO_CATALOG_SERVICE } from '../services/video-catalog';

// The channel states available in grpc (basically an enum).
// See InitConnectivityStateConstants at https://github.com/grpc/grpc/blob/master/src/node/ext/node_grpc.cc
const GrpcStates = grpc.connectivityState;

/**
 * A constant with properties for all the available services states.
 */
export const AvailableStates = {
  UNKNOWN: 0,
  UP: 1,
  DOWN: 2
};

/**
 * A class that monitors the status of the Grpc services (by listening to the underlying
 * channel's events). Will fire 'change' events any time the status changes once it's
 * started. Use the AvailableStates constant to see available arguments passed along with
 * the 'change' event.
 */
export class ServicesMonitor extends EventEmitter {
  constructor() {
    super();
    this._runningPromise = null;
    this._currentState = null;
  }

  /**
   * Start listening to status and firing change events.
   */
  start() {
    // Already started?
    if (this._runningPromise !== null) return;

    this._runningPromise = this._runAsync();
  }

  /**
   * Stop listening to status and firing change events.
   */
  stop() {
    // Already stopped?
    if (this._runningPromise === null) return;

    this._runningPromise.cancel();
    this._runningPromise = null;
    this._currentState = null;
  }

  async _runAsync() {
    // Get client for Video Catalog
    let client = await getGrpcClientAsync(VIDEO_CATALOG_SERVICE);

    // Get underlying channel and promisify its watch method
    let channel = getClientChannel(client);
    let watchConnectivityStateAsync = Promise.promisify(channel.watchConnectivityState, { context: channel });

    // Get the current state and try to connect if not already connected
    let nextState = channel.getConnectivityState(true);
    this._setCurrentState(nextState);

    while (true) {
      // Watch and update state property on changes (passing along the last Grpc state we've seen and a deadline)
      await watchConnectivityStateAsync(nextState, Infinity);
      nextState = channel.getConnectivityState(true);
      this._setCurrentState(nextState);
    }
  }

  _setCurrentState(newState) {
    // Map the state from Grpc to one of our simpler states
    let s;
    switch (newState) {
      case GrpcStates.IDLE:
      case GrpcStates.CONNECTING:
        s = AvailableStates.UNKNOWN;
        break;
      case GrpcStates.TRANSIENT_FAILURE:
      case GrpcStates.FATAL_FAILURE:
        s = AvailableStates.DOWN;
        break;
      case GrpcStates.READY:
        s = AvailableStates.UP;
        break;
      default:
        throw new Error(`Unhandled grpc state ${newState}`);
    }

    logger.log('debug', `Got grpc state ${newState}, setting state ${s}`);

    // Set and emit the event
    if (this._currentState !== s) {
      this._currentState = s;
      this.emit('change', s);
    }
  }
}