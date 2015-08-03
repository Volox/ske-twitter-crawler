
var async        = require('async');
var mongoose     = require('mongoose');
var _            = require("underscore");
var querystring  = require("querystring");
var fs           = require("fs");

var logger       = require("./logger.js");
var crawler      = require("./crawler.js");
var queryBuilder = require("./query-builder.js");

var Tweet = require('./models/tweet.js');
var Brand = require('./models/brand.js');


// Retrive environment variables
var mongoHost = process.env.MONGO_DB_27015_TCP_ADDR;
var mongoDB = process.env.SKE_DATABASE_NAME;
var crawlerStartDate  = process.env.SKE_CRAWLER_START_DATE;

if(!_.isUndefined(mongoHost) && !_.isUndefined(mongoDB) && !_.isUndefined(crawlerStartDate)){
    
  connect(mongoHost, mongoDB);
}
else {
  logger.debug("#index - environment Variables not set")
  process.exit();
}

var connect = function(mongoHost, mongoDB) {

  logger.debug('#index - Connecting to the database');
  mongoose.connect("mongodb://"+mongoHost+"/"+databaseName);
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
