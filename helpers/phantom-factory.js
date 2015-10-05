var async = require('async');
var _       = require("underscore");
var logger  = require('../core/logger');
var phantom = require('phantom');
var freeport = require('freeport');

// Configure phantom's standard error so that it exits every time it crashes
phantom.stderrHandler = function (error) {
    
   if (error.match(/(No such method.*socketSentData)|(CoreText performance note)/)) {
        return;
    }
    logger.error('#phantom-helper - Phantom has crashed - ' +  error);
    mongoose.connection.close();
    process.exit(1);
};

module.exports = {

	// Builds phantom instances on demand
	getPhantomInstace: function(callback) {

		var self = this;

		freeport(function(err, port){

			if(err) {

				logger.error('#phantom-helper - Could not find an available port - ' +  err);
				return callback(err);
			}
			else {

				// create a new phantom process using a new available port
				phantom.create('--load-images=no', { 

					port:port, 
					onExit:function(errorCode){
						
						logger.info('#phantom-helper - Phantom exit with code '+errorCode);
						 
						if(_.isUndefined(errorCode) || errorCode !== 0){              		
						    
						    logger.error('#phantom-helper - phantom process crashed - ' + errorCode);
							process.exit(1);
						}
					}
				}, function(ph){

					self.ph = ph;
					return callback(null, ph)
				});
			}
		});
	},
};