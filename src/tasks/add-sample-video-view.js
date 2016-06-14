import { getGrpcClientAsync } from 'killrvideo-nodejs-common';
import { STATS_SERVICE } from '../services/stats';

/**
 * Adds a view to a video.
 */
export function addSampleVideoView() {
  return getGrpcClientAsync(STATS_SERVICE)
    .then(client => {
      throw new Error('Not implemented');
    });
};

export default addSampleVideoView;