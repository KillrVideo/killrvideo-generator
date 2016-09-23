import Promise from 'bluebird';
import uuid from 'uuid';
import { whenAll } from '../utils/promises';
import { getGrpcClientAsync } from 'killrvideo-nodejs-common';
import { VIDEO_CATALOG_SERVICE } from '../services/video-catalog';
import { getSampleUserIdAsync, getUnusedYouTubeVideoAsync, markYouTubeVideoUsedAsync } from '../sample-data/get-sample-data';
import { stringToUuid } from '../utils/protobuf-conversions';
import { getCassandraClient } from '../utils/cassandra';

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

  if (userId === null) throw new Error('No sample users available');
  
  let videoId = uuid.v4();

  // Make Grpc request
  let request = {
    videoId: stringToUuid(videoId),
    userId: stringToUuid(userId),
    name: video.name,
    description: video.description,
    tags: video.tags,
    youTubeVideoId: video.youTubeVideoId
  };

  await client.submitYouTubeVideoAsync(request);

  // Mark the YouTube video as used and save video Id to cassandra to use in future same data generation
  let cass = getCassandraClient();
  await whenAll([
    markYouTubeVideoUsedAsync(video),
    cass.executeAsync('INSERT INTO videos (videoid) VALUES (?)', [ videoId ])
  ]);
};

export default addSampleVideo;