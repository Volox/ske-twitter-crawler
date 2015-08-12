var _ = require("underscore");
var moment = require("moment");
var async = require("async");
var TwitterQueryCollection = require("./twitter-query-collection");
var MomentHelper = require("../helpers/moment-helper");
var Tweet = require("../models/db/tweet")
var logger = require("../core/logger");

var TwitterQuery = function(searchTerm, sinceDate, untilDate, isHandle){
	
	this.f = 'realtime';
	this.src = 'typd';
	this.q = isHandle ? 'from:':'';
	this.q += searchTerm + ' since:' + sinceDate + ' until:'+untilDate;
};

/*TwitterQuery.buildArrayOfCollectionsForSeeds = function(seeds, since, until){

	var queries = [];
	// obtains all the ranges of one day from: 'since' to 'until'.
	var dates = MomentHelper.computeOneDayDateRanges(since, until);

	_.each(seeds, function(seed){
		
		var seedQueries = [];

		_.each(seed.twitter, function(twitterTerm) {

			if(_.first(twitterTerm) === "@") {

				_.each(dates, function(date){

					var twitterQuery = new TwitterQuery(twitterTerm, date.since, date.until, true);
					seedQueries.push(twitterQuery);
						
				});
			}
			_.each(dates, function(date){
				
				var twitterQuery = new TwitterQuery(twitterTerm, date.since, date.until, false);
				seedQueries.push(twitterQuery);	
			});
		});

		var twitterQueryCollection = new TwitterQueryCollection(seedQueries, seed._id);
		queries.push(twitterQueryCollection);
	});

	return queries;
};*/

TwitterQuery.buildArrayOfCollectionsForSeeds = function(seeds, since, until, callback){

	var queries = [];
	var self = this;
	async.each(seeds, function(seed, innerCallback){
		
		var pCheckLastQueriedDateForSeed = _.partial(self.checkLastQueriedDateForSeed, seed, since);
		var pBuildArrayOfCollectionsForSeed = _.partial(self.buildArrayOfCollectionsForSeed, _, _, until);
		var steps = [pCheckLastQueriedDateForSeed, pBuildArrayOfCollectionsForSeed];
		async.waterfall(steps, function(err, res){
			
			if(err) {

				return innerCallback(err);
			}
			else {
				
				queries.push(res);
				return innerCallback(null);
			}
		});
	}, function(err, res){
		
		if(err) {

			return callback(err);
		}
		else {

			return callback(null, queries);
		}
	});	
};

TwitterQuery.checkLastQueriedDateForSeed = function(seed, since, callback){

	Tweet.aggregate([
		{ 
		  $match: {seed:seed._id}
		},
		{
		  $group:{_id:'$seed', timestamp:{$max:'$timestamp'}}
		}
	], function(err, result){

		if(err) {

		  return callback(err);
		}
		else{
		  
		  // The query didn't match any tweets. Use the default 'since' date
		  if(_.isUndefined(result) || _.isEmpty(result)){
		    
		    return callback(null, seed, since);
		  }
		  // The query found at least one tweet. Use the discovered 'timestamp' as 'since' date
		  else {
		  	
		  	var lastDayQueried = moment.unix(_.first(result).timestamp).format('YYYY-MM-DD');
		  	return callback(null, seed, lastDayQueried);	
		  }
		  
		}
	});
};

TwitterQuery.buildArrayOfCollectionsForSeed = function(seed, since, until, callback){
	
	var dates = MomentHelper.computeOneDayDateRanges(since, until);
	var seedQueries = [];
	logger.info('#twitter-query Building queries for seed ' + seed._id + ' since: ' + since +' until: '+  until);
	_.each(seed.twitter, function(twitterTerm) {

		if(_.first(twitterTerm) === "@") {

			_.each(dates, function(date){

				var twitterQuery = new TwitterQuery(twitterTerm, date.since, date.until, true);
				seedQueries.push(twitterQuery);
					
			});
		}
		_.each(dates, function(date){
			
			var twitterQuery = new TwitterQuery(twitterTerm, date.since, date.until, false);
			seedQueries.push(twitterQuery);	
		});
	});

	return callback(null, seedQueries);
};


exports = module.exports = TwitterQuery;