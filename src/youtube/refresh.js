import Promise from 'bluebird';
import { logger } from 'killrvideo-nodejs-common';
import { getYouTubeClient } from './client';
import { getCassandraClient } from '../utils/cassandra';

const MAX_VIDEOS_PER_REQUEST = 50;
const MAX_VIDEOS_PER_REFRESH = 300;

const INSERT_VIDEO_CQL = 'INSERT INTO youtube_videos (sourceid, published_at, youtube_video_id, name, description) VALUES (?, ?, ?, ?, ?)';

/**
 * Ask Cassandra what the latest video date we've seen for a given source is. Returns the Date.
 */
async function getLatestVideoDateAsync(sourceId){
  let cass = getCassandraClient();
  let result = await cass.executeAsync('SELECT published_at FROM youtube_videos WHERE sourceid = ? LIMIT 1', [ sourceId ]);
  return result.rowLength === 1 ? result.first().published_at : new Date(0);
}

/**
 * Helper function that gets publishedAt Date from a snippet.
 */
function getPublishedAt(snippet) {
  return snippet.hasOwnProperty('publishedAt')
    ? new Date(snippet.publishedAt)
    : new Date(0);
}

// A private cache of currently running refresh Promises
const refreshCache = {};

/**
 * Refresh the videos for a channel source.
 */
export function refreshChannelAsync(sourceId, channelId) {
  if (refreshCache.hasOwnProperty(sourceId)) {
    return refreshCache[sourceId];
  }
  
  logger.log('verbose', `Refreshing YouTube video source ${sourceId}`);
  let promise = _refreshChannelAsync(sourceId, channelId)
    .finally(() => delete refreshCache[sourceId]);

  refreshCache[sourceId] = promise;
  return promise;
};

/**
 * Refresh the videos for a keyword search source.
 */
export function refreshKeywordSearchAsync(sourceId, searchTerms) {
  if (refreshCache.hasOwnProperty(sourceId)) {
    return refreshCache[sourceId];
  }

  logger.log('verbose', `Refreshing YouTube video source ${sourceId}`);
  let promise = _refreshKeywordSearchAsync(sourceId, searchTerms)
    .finally(() => delete refreshCache[sourceId]);

  refreshCache[sourceId] = promise;
  return promise;
};

/**
 * Refresh the videos for a playlist source.
 */
export function refreshPlaylistAsync(sourceId, playlistId) {
  if (refreshCache.hasOwnProperty(sourceId)) {
    return refreshCache[sourceId];
  }

  logger.log('verbose', `Refreshing YouTube video source ${sourceId}`);
  let promise = _refreshPlaylistAsync(sourceId, playlistId)
    .finally(() => delete refreshCache[sourceId]);

  refreshCache[sourceId] = promise;
  return promise;
};

// Does the actual work refreshing a channel
async function _refreshChannelAsync(sourceId, channelId) {
  // Find latest date of video we already know about for the source
  let latestDate = await getLatestVideoDateAsync(sourceId);

  // Make some requests
  let getMoreVideos = true;
  let nextPageToken = null;
  let inserts = [];
  let cass = getCassandraClient();
  let youtube = getYouTubeClient();

  do {
    // Request object for search YouTube API (see https://developers.google.com/apis-explorer/#p/youtube/v3/youtube.search.list)
    let listRequest = { 
      part: 'snippet', 
      channelId, 
      type: 'video', 
      maxResults: MAX_VIDEOS_PER_REQUEST,
      order: 'date'
    };

    if (nextPageToken) {
      listRequest.pageToken = nextPageToken;
    }

    // Get some search results
    let searchResults = await youtube.search.listAsync(listRequest);

    // Iterate over the results and insert appropriate records
    for (let searchResult of searchResults.items) {
      let publishedAt = getPublishedAt(searchResult.snippet);

      // If we've reached the max number of videos to insert or the video is older than our newest video, we
      // can stop
      if (inserts.length > MAX_VIDEOS_PER_REFRESH || publishedAt < latestDate) {
        getMoreVideos = false;
        break;
      }

      // Kick off the insert async
      let insert = cass.executeAsync(
        INSERT_VIDEO_CQL, 
        [ sourceId, publishedAt, searchResult.id.videoId, searchResult.snippet.title, searchResult.snippet.description ]);

      inserts.push(insert);
    }

    // If out of pages, no need to get more videos
    nextPageToken = searchResults.nextPageToken;
    if (!nextPageToken) {
      getMoreVideos = false;
    }
  } while (getMoreVideos === true)

  // Wait for all inserts to complete, then return
  await Promise.all(inserts);
};

// Does the actual work refreshing a keyword search source
async function _refreshKeywordSearchAsync(sourceId, searchTerms) {
  let getMoreVideos = true;
  let nextPageToken = null;
  let inserts = [];
  let cass = getCassandraClient();
  let youtube = getYouTubeClient();

  do {
    // Request object for search YouTube API (see https://developers.google.com/apis-explorer/#p/youtube/v3/youtube.search.list)
    let listRequest = { 
      part: 'snippet',
      q: searchTerms, 
      type: 'video',
      maxResults: MAX_VIDEOS_PER_REQUEST
    };

    if (nextPageToken) {
      listRequest.pageToken = nextPageToken;
    }

    // Get some search results
    let searchResults = await youtube.search.listAsync(listRequest);

    // Iterate search results and insert videos
    for (let searchResult of searchResults.items) {
      // Do we have enough?
      if (inserts.length >= MAX_VIDEOS_PER_REFRESH) {
        getMoreVideos = false;
        break;
      }

      // Kick off the async insert
      let publishedAt = getPublishedAt(searchResult.snippet);
      let insert = cass.executeAsync(
        INSERT_VIDEO_CQL,
        [ sourceId, publishedAt, searchResult.id.videoId, searchResult.snippet.title, searchResult.snippet.description ]);
      
      inserts.push(insert);
    }

    // If out of pages, no need to get more videos
    nextPageToken = searchResults.nextPageToken;
    if (!nextPageToken) {
      getMoreVideos = false;
    }
  } while (getMoreVideos === true)
  
  // Wait for all inserts to complete and then return
  await Promise.all(inserts);
};

// Does the actual work refreshing a playlist
async function _refreshPlaylistAsync(sourceId, playlistId) {
  let getMoreVideos = true;
  let nextPageToken = null;
  let inserts = [];
  let cass = getCassandraClient();
  let youtube = getYouTubeClient();

  do {
    // Request object for playlist items YouTube API (see https://developers.google.com/apis-explorer/#p/youtube/v3/youtube.playlistItems.list)
    let listRequest = { 
      part: 'snippet',
      playlistId,
      maxResults: MAX_VIDEOS_PER_REQUEST
    };

    if (nextPageToken) {
      listRequest.pageToken = nextPageToken;
    }

    // Get some search results
    let searchResults = await youtube.playlistItems.listAsync(listRequest);

    // Iterate over search results and insert
    for (let searchResult of searchResults.items) {
      // Do we have enough videos?
      if (inserts.length >= MAX_VIDEOS_PER_REFRESH) {
        getMoreVideos = false;
        break;
      }

      let publishedAt = getPublishedAt(searchResult.snippet);
      let insert = cass.executeAsync(
        INSERT_VIDEO_CQL,
        [ sourceId, publishedAt, searchResult.snippet.resourceId.videoId, searchResult.snippet.title, searchResult.snippet.description ]);

      inserts.push(insert);
    }

    // If out of pages, no need to get more videos
    nextPageToken = searchResults.nextPageToken;
    if (!nextPageToken) {
      getMoreVideos = false;
    }
  } while (getMoreVideos === true)

  // Wait for all inserts to complete and return
  await Promise.all(inserts);
};