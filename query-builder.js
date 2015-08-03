var _ = require("underscore");


// Prepares the query strings needed to obtain social media content
// from a set of social networks ( currenty only Twitter ).
// @socialSeeds - An array with <Seed> objects
// @sinceDate - The earliest day from which the social media content will be gathered
// @return - An array of <Query> objtects
var prepareQueriesForSeeds = function(seeds, sinceDate){

	var queries = [];

	_.each(seeds, function(seed){
		
		var seedQueries = [];

		_.each(seed.twitter, function(twitterTerm) {

			if(twitterTerm[0] === "@"){

				seedQueries.push(buildTwitterQueryWithAuthor(twitterTerm, sinceDate));
			}

			seedQueries.push(buildTwitterQueryWithTerm(twitterTerm, sinceDate));
		});

		queries.push({
			'seedId':seed._id,
			'twitterQueries':seedQueries
		});
	});

	return queries;
};

var buildTwitterQueryWithTerm = function(searchTerm, sinceDate){
	
	return {
        f: 'realtime',
        q: searchTerm + ' since:' + sinceDate,
        src: 'sprv'
  	};
};

var buildTwitterQueryWithAuthor = function(author, sinceDate){

	return {
        f: 'realtime',
        q: 'from:'+ author + ' since:' + sinceDate,
        src: 'sprv'
  	};
};

exports = module.exports = prepareQueriesForSeeds;