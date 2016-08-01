import Promise from 'bluebird';
import { getGrpcClientAsync } from 'killrvideo-nodejs-common';
import { VIDEO_CATALOG_SERVICE } from '../services/video-catalog';
import { getSampleUserIdAsync, getSampleVideoIdAsync } from './get-sample-data';
import { addSampleUser, addSampleVideo } from '../tasks';

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

  // If we don't have any sample users yet, add 10 initial users
  if (shouldAddUsers) {
    let userPromises = [];
    while (userPromises.length < 10) {
      userPromises.push(addSampleUser());
    }

    await Promise.all(userPromises);
  }

  // If we don't have any sample videos yet, add 10 initial videos 
  if (shouldAddVideos) {
    let videoPromises = [];
    while (videoPromises.length < 10) {
      videoPromises.push(addSampleVideo());
    }

    await Promise.all(videoPromises);
  }

  // If we already had sample videos, also make sure that we have some latest videos available
  // so the UI home page isn't blank
  if (!shouldAddVideos) {
    let client = await getGrpcClientAsync(VIDEO_CATALOG_SERVICE);
    let latestVideos = await client.getLatestVideoPreviewsAsync({ pageSize: 10 });

    // If we don't have at least 10 latest videos, add some videos
    let videosToAdd = latestVideos.videoPreviews.length - 10;
    if (videosToAdd > 0) {
      let videoPromises = [];
      while (videoPromises.length < videosToAdd) {
        videoPromises.push(addSampleVideo());
      }

      await Promise.all(videoPromises);
    }
  }
};