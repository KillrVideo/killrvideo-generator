import Promise from 'bluebird';
import uuid from 'uuid';
import { getGrpcClientAsync } from 'killrvideo-nodejs-common';
import { VIDEO_CATALOG_SERVICE, VideoLocationType } from '../services/video-catalog';
import { getSampleUserIdAsync, getUnusedYouTubeVideoAsync } from '../sample-data/get-sample-data';
import { stringToUuid } from '../utils/protobuf-conversions';

/**
 * Adds a sample YouTube video to the video catalog.
 */
export async function addSampleVideo() {
  // Get sample user id and unused YouTube video
  let [ client, video, userId ] = await Promise.all([
    getGrpcClientAsync(VIDEO_CATALOG_SERVICE),
    getUnusedYouTubeVideoAsync(),
    getSampleUserIdAsync()
  ]);

  if (video === null) throw new Error('No unused YouTube videos available');
  if (userId === null) throw new Error('No sample users available');
  
  // Make Grpc request
  let request = {
    videoId: stringToUuid(uuid.v4()),
    userId: stringToUuid(userId),
    name: video.name,
    description: video.description,
    tags: video.tags,
    youTubeVideoId: video.youTubeVideoId
  };

  await client.submitYouTubeVideoAsync(request);
};

export default addSampleVideo;