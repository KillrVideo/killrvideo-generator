import Promise from 'bluebird';

/**
 * Refresh the videos for a channel source.
 */
export function refreshChannelAsync(sourceId, channelId) {
  return Promise.reject(new Error('Not implemented')); 
};

/**
 * Refresh the videos for a keyword search source.
 */
export function refreshKeywordSearchAsync(sourceId, searchTerms) {
  return Promise.reject(new Error('Not implemented'));
};

/**
 * Refresh the videos for a playlist source.
 */
export function refreshPlaylistAsync(sourceId, playlistId) {
  return Promise.reject(new Error('Not implemented'));
};