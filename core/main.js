
var async = require('async');
var _ = require("underscore");
var logger = require("./logger");

var TwitterHelper = require("../helpers/twitter-helper");
var TwitterQuery = require("../models/twitter-query");
var TwitterQueryCollection = require("../models/twitter-query-collection");
var ArrayUtilities = require("../utilities/array-utilities");

var Tweet = require('../models/db/tweet.js');
var Seed = require('../models/db/seed.js');

// 1. 
var retrieveSeeds = function(callback){
  
  logger.info("#main - retrieveing seeds");
  Seed.find( function(err, seeds){
    
    if(err) {

      logger.error("#main - " + err);
      return callback(err);
    }
    else {

      logger.info("#main - retrieved " + seeds.length + " seeds");
      return callback(null, seeds);
    }
  });
};

// 2.
var prepareQueries = function(seeds, crawlerStartDate, crawlerEndDate, callback){

  logger.info("#main - preparing queries");
  var twitterQueryCollections = TwitterQuery.buildArrayOfCollectionsForSeeds(seeds, crawlerStartDate, crawlerEndDate);
  if(twitterQueryCollections) {

    callback(null, twitterQueryCollections);
  }
  else{

    var error = new Error("#main - creating queries");
    logger.error(error);
    callback(error);
  }

};

// 3. 
var retrieveAndSaveTweets = function(twitterQueryCollections, callback){
  
  logger.info("#index - retrieving and  saving tweets");
  
  // Execute collections in series
  async.eachSeries(twitterQueryCollections, function(twitterQueryCollection, firstCallback){

    logger.info("Crawling tweets for seed: " + twitterQueryCollection.seedId);

    // Create groups of 10 queries
    var batchedTwitterQueries = ArrayUtilities.partitionArray(twitterQueryCollection.queries, 10);
    var seedTweets = [];

    // Execute each group in series
    async.forEachOfSeries(batchedTwitterQueries, function(twitterQueriesBatch, key, secondCallback){
        
        logger.info("Executing batch :" + key + "/" + batchedTwitterQueries.length);

        // Execute the group of 10-queries in parallel
        async.each(twitterQueriesBatch, function(twitterQuery, thirdCallback){

          TwitterHelper.scrapeTweetsFromSearchResult(twitterQuery, function(err, tweets){
            
            if(err){
              return thirdCallback(err);
            }
            debugger;
            seedTweets = seedTweets.concat(tweets);
            return thirdCallback(null);
          });

          //var partialTwitterCrawler = _.partial(TwitterHelper.scrapeTweetsFromSearchResult, twitterQuery);
          //var partialTwitterSaver   = _.partial(saveTweets, _, twitterQueryCollection.seedId);
          //async.waterfall([partialTwitterCrawler, partialTwitterSaver], thirdCallback);
        }, secondCallback);  

    }, function(err){
      
      if(err) {

        return firstCallback(err);
      }

      return saveTweets(seedTweets, twitterQueryCollection.seedId, firstCallback);

    });

  }, callback);
};

// 4. 
var saveTweets = function(tweets, seedId, callback){

  if(!_.isArray(tweets)) {

    var error = new Error ("#index - retrieve tweets yield unexpected result");
    logger.error("#index - " + error);
    return callback(error);
  }
  else if(_.isEmpty(tweets)) {

    logger.info("#index - Couldn't find any tweets for the seed: " + seedId);
    return callback(null);
  }
  else {

    logger.info('#main - Saving ' + tweets.length + ' tweets for seed: ' + seedId);

    _.each(tweets, function(tweet){
      
      tweet.seed = seedId;
    });

    Tweet.create(tweets, function(err, result) {

      // Manage duplicated key errors.
      if(err && err.code !== 11000) {

        logger.error('#main - saving tweets ' + err);
        return callback(err);
      }

      logger.info('#main - Saved ' + result.length + " tweets for seed: " + seedId);
      return callback(null);
    });
  }
};

exports = module.exports = {
  
  start:function(crawler, callback){

    pPrepareQueries = _.partial(prepareQueries, _, crawler.startDate, crawler.endDate);
    async.waterfall([retrieveSeeds, pPrepareQueries, retrieveAndSaveTweets], callback);
  }
};