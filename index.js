
var async        = require('async');
var mongoose     = require('mongoose');
var _            = require("underscore");
var fs           = require("fs");

var logger       = require("./logger.js");
var crawler      = require("./crawler.js");
var queryBuilder = require("./query-builder.js");

var Tweet = require('./models/tweet.js');
var Seed = require('./models/seed.js');

var connect = function(mongoHostAndPort, mongoDB) {

  logger.debug('#index - Connecting to the database');
  mongoose.connect("mongodb://"+mongoHostAndPort+"/"+mongoDB);
  var db = mongoose.connection; 
  
  db.once('open', function() {

    start();
  });
};

var start = function(){

  async.waterfall([retrieveSeeds, prepareQueries, retrieveAndSaveTweets], function(err, result){
    
    if(err) {

      logger.debug("#index " + errr);
      process.exit();
    } 
   
    
    logger.debug("#index - Finished succesfully")
    process.exit();
  });
};

// 1. 
var retrieveSeeds = function(callback){
  
  Seed.find(callback);
};

// 2.
var prepareQueries = function(seeds, callback){

  console.log("Seeds " + seeds);
  console.log("Crawler Date" + crawlerStartDate);
  console.log(queryBuilder);
  var queries = queryBuilder.prepareQueriesForSeeds(seeds, crawlerStartDate);
  callback(null, queries);
};

// 3. 
var retrieveAndSaveTweets = function(queries, callback){
  
  async.each(queries, function(query, firstCallback){

    async.each(query.twitterQueries, function(twitterQuery, secondCallback){
        
        var partialTwitterCrawler = _.partial(crawler.scrapeTweetsFromSearchResult, twitterQuery);
        var partialTwitterSaver   = _.partial(saveTweets, _, query.seedId );

        async.waterfall([partialTwitterCrawler, partialTwitterSaver], secondCallback);
    }, firstCallback);

  }, callback);
};

// 4. 
var saveTweets = function(tweets, seedId, callback){

  if(tweets && tweets.length > 0){

    var Tweet = db.model('tweet');

    _.each(tweets, function(tweet){
      
      tweet.seed = seedId;
    });

    logger.debug('#index - Saving ' + tweets.length + ' tweets for seed: ' + seedId);

    return Tweet.create(tweets, callback);
  } 
  else {

    logger.debug('#index - Could not find any tweets related with seed: ' + seedId);
    callback();
  }
};


// Retrive environment variables
var mongoProtocolHostAndPort = process.env.MONGO_DB_PORT;
var mongoDB = process.env.SKE_DATABASE_NAME;
var crawlerStartDate  = process.env.SKE_CRAWLER_START_DATE;

if(!_.isUndefined(mongoProtocolHostAndPort) && !_.isUndefined(mongoDB) && !_.isUndefined(crawlerStartDate)){
    
  var mongoHostAndPort = mongoProtocolHostAndPort.slice(_.lastIndexOf(mongoProtocolHostAndPort, "/") +1 );
  connect(mongoHostAndPort, mongoDB);
}
else {
  logger.debug("#index - environment Variables not set")
  process.exit();
}
