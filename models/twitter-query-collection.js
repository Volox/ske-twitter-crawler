var _ = require("underscore");

var TwitterQueryCollection = function(twitterQueries, seedId) {
	
	if(_.isArray(twitterQueries) && _.isString(seedId)) {
		
		this.queries = twitterQueries;
		this.seedId = seedId;	
	}
};

exports = module.exports = TwitterQueryCollection;