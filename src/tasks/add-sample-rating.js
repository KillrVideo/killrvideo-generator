import Promise from 'bluebird';
import { random } from 'faker';
import { getGrpcClientAsync } from 'killrvideo-nodejs-common';
import { RATINGS_SERVICE } from '../services/ratings';
import { getSampleUserIdAsync, getSampleVideoIdAsync } from '../utils/get-sample-data';
import { stringToUuid } from '../utils/protobuf-conversions';

/**
 * Adds a sample rating to a video from a user.
 */
export async function addSampleRating() {
  let [ client, userId, videoId ] = await Promise.all([
    getGrpcClientAsync(RATINGS_SERVICE),
    getSampleUserIdAsync(),
    getSampleVideoIdAsync()
  ]);

  if (userId === null) throw new Error('No sample users available');
  if (videoId === null) throw new Error('No sample videos available');

  // Create Grpc request
  let request = {
    videoId: stringToUuid(videoId),
    userId: stringToUuid(userId),
    rating: random.number({ min: 1, max: 5 })
  };

  // Make request
  await client.rateVideoAsync(request);
};

export default addSampleRating;