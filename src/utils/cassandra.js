import Promise from 'bluebird';
import config from 'config';
import {auth, Client, types as CassandraTypes} from 'dse-driver';
import {logger} from './logging';
import {lookupServiceAsync} from './lookup-service';

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

// Get cassandra configuration options
function getCassandraConfig() {
  const { keyspace, replication, dseUsername, dsePassword } = config.get('cassandra');
  return { keyspace, replication, dseUsername, dsePassword };
}

// Client promises by keyspace
const clientPromises = new Map();

/**
 * Gets a Cassandra client instance that is connected to the specified keyspace.
 */
export function getCassandraClientAsync(keyspace, dseUsername, dsePassword) {
  if (clientPromises.has(keyspace)) {
    return clientPromises.get(keyspace);
  }
    
  const promise = lookupServiceAsync('cassandra')
    .then(contactPoints => {
      let clientOpts = {
        contactPoints,
        queryOptions: { 
          prepare: true,
          consistency: CassandraTypes.consistencies.localQuorum
        }
      };
      
      if (keyspace) {
        clientOpts.keyspace = keyspace;
      }

      /**
      * Check for both KILLRVIDEO_DSE_USERNAME and KILLRVIDEO_DSE_PASSWORD environment
      * variables.  If they both exist use the values set within them.  If not,
      * use default values for authentication.
      */
      if (dseUsername && dsePassword) {
        let passwordLength = dsePassword.length;
        logger.info('Using supplied DSE username: "' + dseUsername + '" and password: "***' + dsePassword.substring(passwordLength - 4, passwordLength) + '" from environment variables');

        // Use the values passed in from the config
        clientOpts.authProvider = new auth.DsePlainTextAuthProvider(dseUsername, dsePassword);

      } else {
        logger.info('No detected username/password combination was passed in. DSE cluster authentication method was NOT executed.');
      }

      let Filesystem = require("fs");
      let sslStat = process.env.KILLRVIDEO_ENABLE_SSL;
      logger.info(sslStat);

      if (sslStat === "true") {
        logger.info('SSL is configured to be on.');
        if (Filesystem.existsSync('cassandra.cert')) {
          clientOpts.sslOptions = {
            ca: [Filesystem.readFileSync('cassandra.cert')]
          };
          logger.info('Found cert, read file sync.')
        } else {
          logger.info('No cert found, SSL not enabled.')
        }
      } else if (sslStat === "false") {
        logger.info('SSL is configured to be off.')
      } else {
        logger.info('SSL is not configured, should it be set?')
      }

      // Create a client and promisify it
      let client = new Client(clientOpts);
      client = Promise.promisifyAll(client);
      
      // Connect and return the connected client
      return client.connectAsync().return(client);
    })
    .catch(err => {
      clientPromises.delete(keyspace);
      throw err;
    });
  
  clientPromises.set(keyspace, promise);
  return promise;
}
/**
 * Creates a keyspace in Cassandra if it doesn't already exist. Pass the name of the keyspace and the
 * string to be used as the REPLICATION setting (i.e. after WITH REPLIACTION = ...).
 */
function createKeyspaceIfNotExistsAsync(keyspace, replication, dseUsername, dsePassword) {
  // Create CQL
  const cql = `CREATE KEYSPACE IF NOT EXISTS ${keyspace} WITH REPLICATION = ${replication}`;
  
  // Get a client, then create the keyspace
  return getCassandraClientAsync(null, dseUsername, dsePassword).then(client => client.executeAsync(cql));
}
/**
 * Create the tables if they don't already exist.
 */
function createTablesAsync(client) {
  // Run each CQL statement in the schema array one at a time and then return the client
  return Promise.mapSeries(schema, cql => client.executeAsync(cql)).return(client);
}

// Singleton client instance for app
let clientInstance = null;

/**
 * Get a Cassandra client instance.
 */
export function getCassandraClient() {
  if (clientInstance == null) {
    throw new Error('No client instance found. Did you forget to call initCassandraAsync?');
  }
  return clientInstance;
}
/**
 * Initializes the Cassandra keyspace and schema needed.
 */
export async function initCassandraAsync() {
  // Create keyspace
  let config = getCassandraConfig();
  await createKeyspaceIfNotExistsAsync(config.keyspace, config.replication, config.dseUsername, config.dsePassword);

  // Create tables
  let client = await getCassandraClientAsync(config.keyspace, config.dseUsername, config.dsePassword);
  await createTablesAsync(client);

  // Save client instance
  clientInstance = client;
}
