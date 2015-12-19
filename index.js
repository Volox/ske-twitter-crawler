'use strict';
// Load system modules
let stream = require( 'stream' );
let url = require( 'url' );

// Load modules
let _ = require( 'lodash' );
let co = require( 'co' );
let moment = require( 'moment' );
let Promise = require( 'bluebird' );
let Funnel = require( 'stream-funnel' );
let StreamScraper = require( 'twitter-scraper' ).StreamScraper;
let debug = require( 'debug' )( 'SKE:crawler:twitter' );

// Load my modules
let db = require( './db' );

// Constant declaration
const DATE_FORMAT = 'YYYY-MM-DD';
const COLLECTION_SEEDS = 'seeds';
const COLLECTION_TWEETS = 'tweets';

// DOCKER env variables
const MONGO_PORT = process.env.MONGO_PORT || 'tcp://192.168.59.103:27018';
const DB_NAME = process.env.SKE_DATABASE_NAME || 'ske';
const START_DATE = process.env.SKE_CRAWLER_START_DATE || '2006-03-21';
const END_DATE = process.env.SKE_CRAWLER_END_DATE || moment().format( DATE_FORMAT );
const RX_SEEDS = new RegExp(process.env.SKE_CRAWLER_REGEX || '.*', 'i' );

// Module variables declaration

// Module functions declaration
function getMongoUrl( dockerUrl ) {
  let mongoUrlObject = url.parse( dockerUrl );
  mongoUrlObject.protocol = 'mongodb';
  let mongoUrl = url.format( mongoUrlObject );
  return mongoUrl;
}
function* getSeeds( collectionName, regExp ) {
  let seeds = yield db.find( collectionName, {
    entityName: regExp,
    twitter: { $not: { $size: 0 } },
    crawled: false
  }, { twitter: 1 } ).toArray();

  seeds = _( seeds )
  .map( 'twitter' )
  .flatten()
  .filter( entry => entry[0]==='@' )
  .value();

  return seeds;
}
function getTweetStream( query ) {
  let scraper = new StreamScraper( query );
  return scraper;
}
function saveToDB( tweet, enc, cb ) {
  debug( 'Saving tweet %j', tweet );

  return db.insert( COLLECTION_TWEETS, tweet )
  .catch( err => debug( 'Insert error', err, err.stack ) )
  .then( ()=> {
    debug( 'Save complete' );
    return cb();
  } )
}
// Module class declaration

// Module initialization (at first load)

// Entry point
co( function* () {
  debug( 'Ready' );

  debug( 'Configuration' );
  debug( 'MONGO_PORT: "%s"', MONGO_PORT );
  debug( 'DB_NAME: "%s"', DB_NAME );
  debug( 'START_DATE: "%s"', START_DATE );
  debug( 'END_DATE: "%s"', END_DATE );
  debug( 'RX_SEEDS: "%s"', RX_SEEDS );

  let mongoUrl = getMongoUrl( MONGO_PORT );
  yield db.open( mongoUrl, DB_NAME );

  // Find seeds to use
  let seeds = yield getSeeds( COLLECTION_SEEDS, RX_SEEDS );
  debug( 'Got SEEDS', seeds );

  let funnel = new Funnel( 'Tweets funnel' );
  let writer = new stream.Writable( {
    objectMode: true,
    write: saveToDB,
  } );
  funnel.pipe( writer );

  let actions = [];
  for( let seed of seeds ) {
    let query = `from:${seed} since:${START_DATE} until:${END_DATE}`;
    let tweetStream = getTweetStream( query );
    actions.push( tweetStream );

    funnel.add( tweetStream );
    // Do later
    tweetStream.start();
  }

  let waitPromise = new Promise( ( res, rej )=> {
    writer.on( 'end', res );
    writer.on( 'finish', res );
    writer.on( 'error', rej );
  } );

  yield waitPromise;

  debug( 'All done, bye' );
} )
.catch( err => {
  debug( 'FUUUU ERROR', err, err.stack );
} )
.then( db.close )