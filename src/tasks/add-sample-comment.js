import Promise from 'bluebird';
import { lorem, random } from 'faker';
import uuid from 'uuid';
import { getGrpcClientAsync } from 'killrvideo-nodejs-common';
import { COMMENTS_SERVICE } from '../services/comments';
import { getSampleUserIdAsync, getSampleVideoIdAsync } from '../utils/get-sample-data';
import { stringToUuid } from '../utils/protobuf-conversions';

/**
 * Adds a sample comment to a video.
 */
export async function addSampleComment() {
  let [ client, userId, videoId ] = await Promise.all([
    getGrpcClientAsync(COMMENTS_SERVICE),
    getSampleUserIdAsync(),
    getSampleVideoIdAsync()
  ]);

  if (userId === null) throw new Error('No sample users available');
  if (videoId === null) throw new Error('No sample videos available');

  // Create request for service
  let request = {
    videoId: stringToUuid(videoId),
    userId: stringToUuid(userId),
    commentId: stringToUuid(uuid.v1()),
    // Comment with 1-5 sentences
    comment: lorem.paragraph(random.number({ min: 1, max: 5 }))
  };

  // Make request
  await client.commentOnVideoAsync(request);
};

export default addSampleComment;