
var _ = require("underscore");

var _partitionArray = function(arrayToPartition, partitionSize, result){

	if(partitionSize > arrayToPartition.length){
		
		if(arrayToPartition.length > 0) {

			result.push(arrayToPartition);
		}
	}
	else {
		
		result.push(arrayToPartition.splice(0, partitionSize));
		_partitionArray(arrayToPartition, partitionSize, result);
	}
};

exports = module.exports = {

	'partitionArray':function(arrayToPartition, partitionSize){

		if(_.isUndefined(arrayToPartition)){
			
			return undefined;
		}

		if(_.isUndefined(partitionSize)){
			
			return undefined;
		}

		if(partitionSize <= 0){
			
			return undefined;
		}

		var result = [];
		
		_partitionArray(arrayToPartition, partitionSize, result);
		
		return result;
	}
};



