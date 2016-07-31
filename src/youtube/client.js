import { youtube } from 'googleapis';
import config from 'config';
import Promise from 'bluebird';

// Shared client instance
let client = null;

/**
 * Get a YouTube API client.
 */
export function getYouTubeClient() {
  if (client !== null) return client;

  // Load API key and create client instance
  let auth = config.get('youTubeApiKey');
  let c = youtube({ version: 'v3', auth });

  // Promisify methods we need
  Promise.promisifyAll(c.search);
  Promise.promisifyAll(c.playlistItems);

  // Save and return
  client = c;
  return client;
};