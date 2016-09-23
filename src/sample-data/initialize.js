import Promise from 'bluebird';
import { waitForClientReady } from 'grpc';
import { logger } from '../utils/logging';
import { whenAll } from '../utils/promises';
import { getGrpcClientAsync } from '../utils/grpc-client';
import { VIDEO_CATALOG_SERVICE } from '../services/video-catalog';
import { getSampleUserIdAsync, getSampleVideoIdAsync } from './get-sample-data';
import { addSampleUser, addSampleVideo } from '../tasks';

const INITIAL_USERS = 10;
const INITIAL_VIDEOS = 10;

/**
 * Makes sure there is a base level of sample data available. Meant to be run before
 * the scheduler starts adding sample data on a schedule.
 */
export async function initializeSampleDataAsync() {
  // See if we have sample user/video ids available to tasks
  let [ userId, videoId ] = await Promise.all([
    getSampleUserIdAsync(),
    getSampleVideoIdAsync()
  ]);

  let shouldAddUsers = userId === null;
  let shouldAddVideos = videoId === null;

  // If we don't have any sample users yet, add initial users
  if (shouldAddUsers) {
    logger.log('verbose', `Adding ${INITIAL_USERS} initial sample users`);

    let userPromises = [];
    while (userPromises.length < INITIAL_USERS) {
      userPromises.push(addSampleUser());
    }

    await whenAll(userPromises);
  }

  // If we don't have any sample videos yet, add initial videos 
  if (shouldAddVideos) {
    logger.log('verbose', `Adding ${INITIAL_VIDEOS} initial sample videos`);

    let videoPromises = [];
    while (videoPromises.length < 10) {
      videoPromises.push(addSampleVideo());
    }

    await whenAll(videoPromises);
  }

  // If we already had sample videos, also make sure that we have some latest videos available
  // so the UI home page isn't blank
  if (!shouldAddVideos) {
    let client = await getGrpcClientAsync(VIDEO_CATALOG_SERVICE);
    let latestVideos = await client.getLatestVideoPreviewsAsync({ pageSize: INITIAL_VIDEOS });

    // If we don't have latest videos, add some videos
    let videosToAdd = INITIAL_VIDEOS - latestVideos.videoPreviews.length;
    if (videosToAdd > 0) {
      logger.log('verbose', `Adding ${videosToAdd} sample videos`);
      
      let videoPromises = [];
      while (videoPromises.length < videosToAdd) {
        videoPromises.push(addSampleVideo());
      }

      await whenAll(videoPromises);
    }
  }
};