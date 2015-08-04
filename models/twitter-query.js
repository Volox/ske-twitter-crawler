var _ = require("underscore");
var TwitterQueryCollection = require("./twitter-query-collection");

var TwitterQuery = function(searchTerm, sinceDate, isHandle){
	
	this.f = 'realtime';
	this.src = 'typd';
	this.q = isHandle ? 'from:':'';
	this.q += searchTerm + ' since:' + sinceDate;
};

TwitterQuery.buildArrayOfCollectionsForSeeds = function(seeds, sinceDate){

	var queries = [];

	_.each(seeds, function(seed){
		
		var seedQueries = [];

		_.each(seed.twitter, function(twitterTerm) {

			if(_.first(twitterTerm) === "@") {

				var twitterQuery = new TwitterQuery(twitterTerm, sinceDate, true);
				seedQueries.push(twitterQuery);
			}

			var twitterQuery = new TwitterQuery(twitterTerm, sinceDate, false);
			seedQueries.push(twitterQuery);
		});
		debugger;
		var twitterQueryCollection = new TwitterQueryCollection(seedQueries, seed._id);
		queries.push(twitterQueryCollection);

	});

	return queries;
};

exports = module.exports = TwitterQuery;