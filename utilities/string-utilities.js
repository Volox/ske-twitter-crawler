var _ = require("underscore");


exports = module.exports = {
	
	checkStringsNotEmpty:function(strings){

		if( _.isArray(strings) ){
			
			return _.every(strings, function(string){

				return !_.isUndefined(string) && !_.isEmpty(string)
			});
			
		}
		return false;
	}
}