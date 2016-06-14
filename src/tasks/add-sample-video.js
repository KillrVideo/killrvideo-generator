import { getGrpcClientAsync } from 'killrvideo-nodejs-common';
import { VIDEO_CATALOG_SERVICE, VideoLocationType } from '../services/video-catalog';

/**
 * Adds a sample YouTube video to the video catalog.
 */
export function addSampleVideo() {
  return getGrpcClientAsync(VIDEO_CATALOG_SERVICE)
    .then(client => {
      throw new Error('Not implemented');
    });
};

export default addSampleVideo;