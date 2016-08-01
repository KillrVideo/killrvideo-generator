import uuid from 'uuid';
import { random } from 'faker';
import { logger } from 'killrvideo-nodejs-common';
import { getCassandraClient } from '../utils/cassandra';
import { YouTubeVideoSources } from '../youtube/sources';

/**
 * Gets a random sample user's Id. Returns null if none are available.
 */
export async function getSampleUserIdAsync() {
  let cass = getCassandraClient();

  // Get the first userid above and below a random uuid in parallel
  let userId = uuid.v4();
  let userIdResults = await Promise.all([
    cass.executeAsync('SELECT userid FROM users WHERE token(userid) >= token(?) LIMIT 1', [ userId ]),
    cass.executeAsync('SELECT userid FROM users WHERE token(userid) < token(?) LIMIT 1', [ userId ])
  ]);

  // Return results from first query that returned a row or null if neither did
  let resultsToUse = userIdResults[0].rowLength > 0
    ? userIdResults[0]
    : userIdResults[1].rowLength > 0
      ? userIdResults[1]
      : null;

  return resultsToUse === null
    ? null
    : resultsToUse.first().userid.toString();
};

/**
 * Gets a random sample video's Id. Returns null if none are available.
 */
export async function getSampleVideoIdAsync() {
  let cass = getCassandraClient();

  // Get the first videoid above and below a random uuid in parallel
  let videoId = uuid.v4();
  let videoIdResults = await Promise.all([
    cass.executeAsync('SELECT videoid FROM videos WHERE token(videoid) >= token(?) LIMIT 1', [ videoId ]),
    cass.executeAsync('SELECT videoid FROM videos WHERE token(videoid) < token(?) LIMIT 1', [ videoId ])
  ]);

  // Return results from first query that returned a row or null if neither did
  let resultsToUse = videoIdResults[0].rowLength > 0
    ? videoIdResults[0]
    : videoIdResults[1].rowLength > 0
      ? videoIdResults[1]
      : null;

  return resultsToUse === null
    ? null
    : resultsToUse.first().videoid.toString();
};

/**
 * Helper function that takes a row from C* and a YouTube video source and returns an object
 * that represents the YouTube video.
 */
function mapRowAndSourceToYouTubeVideo(row, source) {
  // Start with data in the row
  let video = {
    publishedAt: row.published_at,
    youTubeVideoId: row.youtube_video_id,
    name: row.name,
    description: row.description
  };

  // Try to assign some tags from the source to the video
  let tags = [];
  let maxTags = random.number({ min: 3, max: 6 });

  // Look for source's tags in the video's name or description
  let lowerName = video.name.toLowerCase();
  let lowerDescription = video.description.toLowerCase();
  for (let possibleTag of source.allTags) {
    if (lowerName.indexOf(possibleTag) > -1 || lowerDescription.indexOf(possibleTag) > -1) {
      tags.push(possibleTag);
    }

    if (tags.length === maxTags) break;
  }

  // If we didn't get any tags, just add some random ones from the source's tags list
  if (tags.count === 0) {
    Array.prototype.push.apply(tags, source.sourceTags.slice(0, maxTags));
  }

  video.tags = tags;
  return video;
}

// Cache of videos we're currently attempting to mark as used (this is just a rough attempt at preventing
// duplicate videos being added when we're adding a bunch in parallel like on initial load)
let consumingCache = {};

/**
 * Tries to find an unused video for the given source, mark it as used and returns it. Returns null if an
 * unused video can't be found.
 */
async function consumeUnusedVideoAsync(source) {
  // Use the source's id to get a page of records
  let pageState = null;
  let cass = getCassandraClient();
  do {
    let queryOpts = pageState === null ? {} : { pageState };
    let resultSet = await cass.executeAsync('SELECT * FROM youtube_videos WHERE sourceid = ?', [ source.sourceId ], queryOpts);

    // Try to find an unused video in the rows returned
    for (let row of resultSet.rows) {
      let cacheKey = row.youtube_video_id;

      // If the row hasn't been marked as used and isn't currently being consumed by some other task
      if (row.used !== true && consumingCache.hasOwnProperty(cacheKey) === false) {
        // Add to cache so another task doesn't try and use it while we're marking it as used
        consumingCache[cacheKey] = true;
        await cass.executeAsync(
          'UPDATE youtube_videos SET used = true WHERE sourceid = ? AND published_at = ? AND youtube_video_id = ?',
          [ source.sourceId, row.published_at, row.youtube_video_id ]);

        // Delete from the cache in a minute
        setTimeout(() => delete consumingCache[cacheKey], 60000);

        return mapRowAndSourceToYouTubeVideo(row, source);
      }
    }

    // Set page state for next query
    pageState = resultSet.pageState;
  } while (pageState);

  return null;
}

/**
 * Gets an unused YouTube video from available sources, marks it as used, and returns it. Returns null
 * if one cannot be found.
 */
export async function getUnusedYouTubeVideoAsync() {
  let cass = getCassandraClient();

  // Walk sources starting from a random index
  let sources = Object.keys(YouTubeVideoSources).map(k => YouTubeVideoSources[k]);
  let startIdx = random.number({ min: 0, max: sources.length - 1 });

  for (let i = startIdx; i < sources.length + startIdx; i++) {
    // Get the current source
    let idx = i % sources.length;
    let source = sources[idx];

    // Try to get an unused video
    let video = await consumeUnusedVideoAsync(source);
    if (video !== null) return video;

    // We failed, so refresh the source and try again
    logger.log('verbose', `Refreshing YouTube video source ${source.sourceId}`);
    await source.refreshAsync();
    video = await consumeUnusedVideoAsync(source);
    if (video !== null) return video;

    // Log a warning that the video source is out of videos and go to next source
    logger.log('warn', `YouTube video source ${source.sourceId} is exhausted`);
  }

  throw new Error('Unable to find an unused YouTube video');
};