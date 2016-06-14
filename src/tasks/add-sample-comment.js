import { getGrpcClientAsync } from 'killrvideo-nodejs-common';
import { COMMENTS_SERVICE } from '../services/comments';

/**
 * Adds a sample comment to a video.
 */
export function addSampleComment() {
  return getGrpcClientAsync(COMMENTS_SERVICE)
    .then(client => {
      throw new Error('Not implemented');
    });
};

export default addSampleComment;