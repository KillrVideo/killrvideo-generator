import { getGrpcClientAsync } from 'killrvideo-nodejs-common';
import { RATINGS_SERVICE } from '../services/ratings';

/**
 * Adds a sample rating to a video from a user.
 */
export function addSampleRating() {
  return getGrpcClientAsync(RATINGS_SERVICE)
    .then(client => {
      throw new Error('Not implemented');
    });
};

export default addSampleRating;