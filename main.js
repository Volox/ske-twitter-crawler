
var async        = require('async');
var _            = require("underscore");
var logger       = require("./logger");
var crawler      = require("./crawler");
var queryBuilder = require("./query-builder");

var Tweet = require('./models/tweet.js');
var Seed = require('./models/seed.js');

// 1. 
var retrieveSeeds = function(callback){
  
  Seed.find(callback);
};

// 2.
var prepareQueries = function(seeds, crawlerStartDate, callback){

  var queries = queryBuilder.prepareQueriesForSeeds(seeds, crawlerStartDate);
  callback(null, queries);
};

// 3. 
var retrieveAndSaveTweets = function(queries, db, callback){
  
  async.each(queries, function(query, firstCallback){

    async.each(query.twitterQueries, function(twitterQuery, secondCallback){
        
        var partialTwitterCrawler = _.partial(crawler.scrapeTweetsFromSearchResult, twitterQuery);
        var partialTwitterSaver   = _.partial(saveTweets, _, query.seedId, db);

        async.waterfall([partialTwitterCrawler, partialTwitterSaver], secondCallback);
    }, firstCallback);

  }, callback);
};

// 4. 
var saveTweets = function(tweets, seedId, db, callback){

  if(tweets && tweets.length > 0){

    var Tweet = db.model('tweet');

    _.each(tweets, function(tweet){
      
      tweet.seed = seedId;
    });

    logger.debug('#index - Saving ' + tweets.length + ' tweets for seed: ' + seedId);

    Tweet.save(tweets, function(err){
      
      if(err) {
        
        logger.log("#main - error saving tweets" + err);
        return callback(err);
      }
      
      logger.log("#main - tweets were saved");
      return callback(null);
    });
  } 
  else {

    logger.debug('#index - Could not find any tweets related with seed: ' + seedId);
    callback(null);
  }
};

exports = module.exports = {
  
  start:function(db, crawlerStartDate){

    var pRetrieveAndSaveTweets = _.partial(retrieveAndSaveTweets, _, db);
    var pPrepareQueries = _.partial(prepareQueries, _, crawlerStartDate);
    async.waterfall([retrieveSeeds, pPrepareQueries, pRetrieveAndSaveTweets], function(err, result){
      
      if(err) {

        logger.debug("#index " + errr);
        process.exit();
      } 
     
      logger.debug("#index - Finished succesfully")
      process.exit();
    });
  }
};