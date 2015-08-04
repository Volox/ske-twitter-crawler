var _ = require("underscore");


exports = module.exports = {
	
	checkStringsNotEmpty:function(strings){

		if( _.isArray(strings) ){
			
			_.each(strings, function(string){

				if( _.isUndefined(string) || _.isEmpty(string)){

					return false;
				}
			});

			return true;
		}
		return false;
	}
}