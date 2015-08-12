
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
var retrieveSeeds = function(regex, callback) {
  
  logger.info("#main - Retrieveing seeds that match regex: " + regex );

  // Retrieve the seeds that: a) have a name that matches the regex; b) have not been crawled; and c) Have twitter-handles
  Seed.find({entityName:{$regex:regex, $options:'i'}, twitter:{$not:{$size:0}}, crawled:false}, function(err, seeds){
    
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
var crawlTwitterWithQueryCollections = function(twitterQueryCollections, seeds, callback) {
  
  logger.info("#main - retrieving and  saving tweets");

  // Excute the crawling process in sequence for the queries associated with each seed
  async.eachSeries(twitterQueryCollections, function(twitterQueryCollection, firstCallback){

    // Retrieve the seed referenced by the QueryCollection
    var seed = _.find(seeds, function(seed){
      return seed._id === twitterQueryCollection.seedId;
    });

    // Retrieve and save tweets. Then mark the seed as crawled
    var pCrawlTwitterWithQueryCollection = _.partial(crawlTwitterWithQueryCollection, twitterQueryCollection);
    var pMarkSeedAsCrawled = _.partial(markSeedAsCrawled, seed);
    async.series([pCrawlTwitterWithQueryCollection, pMarkSeedAsCrawled], firstCallback);
    
  }, callback);
}

var crawlTwitterWithQueryCollection = function(twitterQueryCollection, callback){
  
  logger.info("#main - Retrieving tweets for seed: " + twitterQueryCollection.seedId);

  // Create groups of 10 queries
  var batchedTwitterQueries = ArrayUtilities.partitionArray(twitterQueryCollection.queries, 10);
  
  // Execute each group in series
  async.forEachOfSeries(batchedTwitterQueries, function(twitterQueriesBatch, key, firstCallback){
      
      logger.info("#main - Executing batch :" + (key+1) + "/" + batchedTwitterQueries.length);

      var pCrawlTwitterWithQueryBatch = _.partial(crawlTwitterWithQueryBatch, twitterQueriesBatch);
      var pSaveTweets = _.partial(saveTweets, _, twitterQueryCollection.seedId);
      var steps = [pCrawlTwitterWithQueryBatch, pSaveTweets];
      async.waterfall(steps, firstCallback);

  }, callback);
};

var crawlTwitterWithQueryBatch = function(twitterQueriesBatch, callback){

  // Execute the group of 10-queries in parallel
  var crawledTweets = [];

  async.eachSeries(twitterQueriesBatch, function(twitterQuery, firstCallback){

    // Retrieve tweets and save them
    var twitterHelper = new TwitterHelper();
    twitterHelper.scrapeTweetsFromSearchResult(twitterQuery, function(err, tweets){
      
      if(err){
        return firstCallback(err);
      }
      
      crawledTweets = crawledTweets.concat(tweets);
      return firstCallback(null);
    });
  }, function(err){
    
    if(err) {

      return callback(err);
    }

    return callback(null, crawledTweets);
  });   
};

var saveTweets = function(tweets, seedId, callback){

  if(!_.isArray(tweets)) {

    var error = new Error ("#main - retrieve tweets yield unexpected result");
    logger.error("#main - " + error);
    return callback(error);
  }
  else if(_.isEmpty(tweets)) {

    logger.info("#main - Found no tweets for seed: " + seedId + " in current batch");
    return callback(null);
  }
  else {

    logger.info('#main - Saving ' + tweets.length + ' tweets for seed: ' + seedId);

    _.each(tweets, function(tweet){
      
      tweet.seed = seedId;
    });

    Tweet.create(tweets, function(err, result) {

      if(err) {
        
        // Manage duplicated key errors.  
        if(err.code === 11000){

          return callback(null);
        }
        else {
          
          logger.error('#main - saving tweets ' + err);
          return callback(err);
        }
      }
      else {

        if(!_.isUndefined(result) && _.isArray(result)) {

          logger.info('#main - Saved ' + result.length + " tweets for seed: " + seedId);
        }

        return callback(null);
      }
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
  
  logger.info('#main - Marking seed ' + seed._id + ' as crawled');

  seed.crawled = true;
  seed.save(function(err){
    
    if(err) {

      logger.error('#main - marking seed as crawled - ' + err);
      return callback(err);
    }

    logger.info('#main - Marked seed ' + seed._id + ' as crawled');
    return callback(null);
  });
}

exports = module.exports = {
  
  start:function(crawler, callback){
    
    pRetrieveSeeds = _.partial(retrieveSeeds, crawler.regex);
    pPrepareQueries = _.partial(prepareQueries, _, crawler.startDate, crawler.endDate);
    async.waterfall([pRetrieveSeeds, pPrepareQueries, crawlTwitterWithQueryCollections], callback);
  }
};
