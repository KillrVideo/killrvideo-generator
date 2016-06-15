import Promise from 'bluebird';
import { logger, createKeyspaceIfNotExistsAsync, getCassandraClientAsync } from 'killrvideo-nodejs-common';

/**
 * An array of CQL table strings to use for the schema.
 */
const schema = [
  // Keeps track of sample users added
  `
  CREATE TABLE IF NOT EXISTS users (
    userid uuid,
    PRIMARY KEY(userid)
  );`,

  // Keeps track of sample videos added
  `
  CREATE TABLE IF NOT EXISTS videos (
    videoid uuid,
    PRIMARY KEY (videoid)
  );`,

  // Keeps track of the available YouTube videos
  `
  CREATE TABLE IF NOT EXISTS youtube_videos (
    sourceid text,
    published_at timestamp,
    youtube_video_id text,
    name text,
    description text,
    used boolean,
    PRIMARY KEY (sourceid, published_at, youtube_video_id)
  ) WITH CLUSTERING ORDER BY (published_at DESC, youtube_video_id ASC);`
];

// TODO: Temporarily hardcoded these settings
function getCassandraConfig() {
  return {
    keyspace: 'killrvideo_sample_data',
    replication: "{ 'class' : 'SimpleStrategy', 'replication_factor' : 1 }"
  };
}

/**
 * Create the tables if they don't already exist.
 */
function createTablesAsync(client) {
  // Run each CQL statement in the schema array one at a time
  return Promise.mapSeries(schema, cql => client.executeAsync(cql));
}

/**
 * Initializes the Cassandra keyspace and schema needed.
 */
export function initCassandraAsync() { 
  return Promise.try(getCassandraConfig)
    .then(config => createKeyspaceIfNotExistsAsync(config.keyspace, config.replication).return(config))
    .then(config => getCassandraClientAsync(config.keyspace))
    .then(createTablesAsync)
    .catch(err => {
      logger.log('verbose', err.message);
      throw err;
    });
};