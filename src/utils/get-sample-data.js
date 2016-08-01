import { getCassandraClient } from './cassandra';
import uuid from 'uuid';

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
    : resultsToUse.first().userid;
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
    : resultsToUse.first().videoid;
};

