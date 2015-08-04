
var async  = require('async');
var _      = require("underscore");
var logger = require("./logger");

var TwitterHelper           = require("../helpers/twitter-helper");
var TwitterQuery            = require("../models/twitter-query");
var TwitterQueryCollection  = require("../models/twitter-query-collection");

var Tweet = require('../models/db/tweet.js');
var Seed  = require('../models/db/seed.js');

// 1. 
var retrieveSeeds = function(callback){
  
  logger.info("#index - retrieveing seeds");
  Seed.find(callback, function(err, seeds){
    
    if(err) {

      logger.err("#index - " + err);
      return callback(err);
    }
    else {

      logger.info("#index - retrieved " + seeds.length + " seeds");
      return callback(null, seeds);
    }
  });
};

// 2.
var prepareQueries = function(seeds, crawlerStartDate, callback){

  logger.info("#index - preparing queries");
  var twitterQueryCollections = TwitterQuery.buildArrayOfCollectionsForSeeds(seeds, crawlerStartDate);
  callback(null, twitterQueryCollections);
};

// 3. 
var retrieveAndSaveTweets = function(twitterQueryCollections, callback){
  
  logger.info("#index - retrieving and  saving tweets");
  async.each(twitterQueryCollections, function(twitterQueryCollection, firstCallback){

    async.each(twitterQueryCollection.queries, function(twitterQuery, secondCallback){
        
        var partialTwitterCrawler = _.partial(TwitterHelper.scrapeTweetsFromSearchResult, twitterQuery);
        var partialTwitterSaver   = _.partial(saveTweets, _, twitterQueryCollection.seedId);

        async.waterfall([partialTwitterCrawler, partialTwitterSaver], secondCallback);

    }, firstCallback);

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
  
  start:function(crawlerStartDate, callback){

    async.waterfall([retrieveSeeds, pPrepareQueries, retrieveAndSaveTweets], callback);
  }
};