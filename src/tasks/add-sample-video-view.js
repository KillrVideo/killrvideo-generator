import Promise from 'bluebird';
import { getGrpcClientAsync } from 'killrvideo-nodejs-common';
import { STATS_SERVICE } from '../services/stats';
import { getSampleVideoIdAsync } from '../utils/get-sample-data';
import { stringToUuid } from '../utils/protobuf-conversions';

/**
 * Adds a view to a video.
 */
export async function addSampleVideoView() {
  let [ client, videoId ] = await Promise.all([
    getGrpcClientAsync(STATS_SERVICE),
    getSampleVideoIdAsync()
  ]);

  if (videoId === null) throw new Error('No sample videos available');

  await client.recordPlaybackStartedAsync({
    videoId: stringToUuid(videoId)
  });
};

export default addSampleVideoView;