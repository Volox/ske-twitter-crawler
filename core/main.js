
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
var retrieveSeeds = function(callback) {
  
  logger.info("#main - retrieveing seeds");

  // Retrieve the seeds that have not been crawled
  Seed.find({crawled:false}, function(err, seeds){
    
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
var prepareQueries = function(seeds, crawlerStartDate, crawlerEndDate, callback) {

  logger.info("#main - preparing queries");
  
  // Create an array of queries. One for each day betwee crawlerStartDate and crawlerEndDate
  // and using all the social media handles of the seeds
  var twitterQueryCollections = TwitterQuery.buildArrayOfCollectionsForSeeds(seeds, crawlerStartDate, crawlerEndDate);
  if(twitterQueryCollections) {

    var queriesCount = _.reduce(_.pluck(twitterQueryCollections, 'queries'), function(memo, array){
      return memo+array.length;
    }, 0);
    
    logger.info("#main - prepared " + queriesCount +" queries");
    callback(null, twitterQueryCollections, seeds);
  }
  else{

    var error = new Error("#main - creating queries");
    logger.error(error);
    callback(error);
  }
};

// 3.
var crawlTwitter = function(twitterQueryCollections, seeds, callback) {
  
  logger.info("#main - retrieving and  saving tweets");

  // Excute the crawling process in sequence for the queries associated with each seed
  async.eachSeries(twitterQueryCollections, function(twitterQueryCollection, firstCallback){

    // Retrieve the seed referenced by the QueryCollection
    var seed = _.find(seeds, function(seed){
      return seed._id === twitterQueryCollection.seedId;
    });

    // Retrieve and save tweets. Then mark the seed as crawled
    var pRetrieveAndSaveTweets = _.partial(retrieveAndSaveTweets, twitterQueryCollection);
    var pMarkSeedAsCrawled = _.partial(markSeedAsCrawled, seed);
    async.series([pRetrieveAndSaveTweets, pMarkSeedAsCrawled], firstCallback);
    
  }, callback);
}

// 3.1
var retrieveAndSaveTweets = function(twitterQueryCollection, callback){
  
  logger.info("#main - Retrieving tweets for seed: " + twitterQueryCollection.seedId);

  // Create groups of 10 queries
  var batchedTwitterQueries = ArrayUtilities.partitionArray(twitterQueryCollection.queries, 10);
  
  // Execute each group in series
  async.forEachOfSeries(batchedTwitterQueries, function(twitterQueriesBatch, key, firstCallback){
      
      logger.info("#main - Executing batch :" + (key+1) + "/" + batchedTwitterQueries.length);

      // Execute the group of 10-queries in parallel
      async.each(twitterQueriesBatch, function(twitterQuery, secondCallback){

        // Retrieve tweets and save them
        var twitterHelper = new TwitterHelper();
        var pScrapeTweetsFromSearchResult = _.partial(twitterHelper.scrapeTweetsFromSearchResult, twitterQuery);
        var pSaveTweets = _.partial(saveTweets, _, twitterQueryCollection.seedId);
        var steps = [pScrapeTweetsFromSearchResult, pSaveTweets];
        async.waterfall(steps, secondCallback);

      }, firstCallback);   
  }, callback);
};

// 3.2
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

// 4. 
var markSeedAsCrawled = function(seed, callback){
  
  if(_.isUndefined(seed)){

    var error = new Error ("#main - seed cannot be undefined");
    logger.error("#main - " + error);
    return callback(error);
  }
  
  logger.error('#main - Marking seed ' + seed._id + ' as crawled');

  seed.crawled = true;
  seed.save(function(err){
    
    if(err) {

      logger.error('#main - marking seed as crawled - ' + err);
      return callback(err);
    }

    logger.error('#main - Marked seed ' + seed._id + ' as crawled');
    return callback(null);
  });
}

exports = module.exports = {
  
  start:function(crawler, callback){

    pPrepareQueries = _.partial(prepareQueries, _, crawler.startDate, crawler.endDate);
    async.waterfall([retrieveSeeds, pPrepareQueries, crawlTwitter], callback);
  }
};