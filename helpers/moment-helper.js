var moment = require('moment');
var _ = require('underscore');

computeDates:function (since, until, times, res){
	
	if(times === 0){
		return res;
	}

	res.push({
		'since':since.format('YYYY-MM-DD'), 
		'until':until.format('YYYY-MM-DD')
	});

	computeDates(since.add(1, 'd'), until.add(1, 'd'), times--, res);
};

exports = module.exports = {

	computeOneDayDateRanges:function(since, until){
		
		var validParams = _.every([since, until], function(date){
			
			if(!_.isString(date)){
				return false;
			}

			if(_.isEmpty(date)){
				return false;
			}

			if(!moment(date, 'YYYY-MM-DD').isValid()){
				return false;
			}

			return true;
		});

		if(validParams && moment(since).isBefore(until)){

			var sinceDate = moment(since, 'YYYY-MM-DD');
			var untilDate = moment(until, 'YYYY-MM-DD');
			var days = parseInt(moment.duration(untilDate.diff(sinceDate)).asDays());
			return computeDates(sinceDate, sinceDate.add(1, 'd'), days, []);
		}	

		return undefined;
	}
}
