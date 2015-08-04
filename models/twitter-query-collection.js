var _ = require("underscore");

var TwitterQueryCollection = function(twitterQueries, seedId) {
	
	debugger;
	if(_.isArray(twitterQueries) && _.isString(seedId)) {
		debugger;
		this.queries = twitterQueries;
		this.seedId = seedId;	
	}
};

exports = module.exports = TwitterQueryCollection;