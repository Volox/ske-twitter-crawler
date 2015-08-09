var _ = require("underscore");
var TwitterQueryCollection = require("./twitter-query-collection");
var MomentHelper = require("../helpers/moment-helper");

var TwitterQuery = function(searchTerm, sinceDate, untilDate, isHandle){
	
	this.f = 'realtime';
	this.src = 'typd';
	this.q = isHandle ? 'from:':'';
	this.q += searchTerm + ' since:' + sinceDate + ' until:'+untilDate;
};

TwitterQuery.buildArrayOfCollectionsForSeeds = function(seeds, since, until){

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
};

exports = module.exports = TwitterQuery;