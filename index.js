

var mongoose = require('mongoose');
var _        = require("underscore");
var logger   = require("./core/logger");
var main     = require("./core/main");
var StringUtilities = require("./utilities/string-utilities")

// Retrive environment variables
var mongo = {
  
  'protocolHostAndPort':process.env.MONGO_PORT,
  'dbName': process.env.SKE_DATABASE_NAME
};

var crawler = {
  'startDate': process.env.SKE_CRAWLER_START_DATE,
  'endDate': process.env.SKE_CRAWLER_END_DATE
};

var requiredVariables = [mongo.protocolHostAndPort, mongo.dbName, crawler.startDate, crawler.endDate];

// Check if environment variables have been set
if(StringUtilities.checkStringsNotEmpty(requiredVariables)){
  
  // Slice out the Protocol prefix - i.e tcp://
  mongo.hostAndPort = mongo.protocolHostAndPort.slice(_.lastIndexOf(mongo.protocolHostAndPort, "/") +1 );
  
  // Start database
  logger.info('#index - Connecting to the database');
  mongoose.connect("mongodb://"+mongo.hostAndPort+"/"+mongo.dbName);
  db = mongoose.connection; 
  
  db.once('open', function() {
    
    main.start(crawler, function(err, result){

      if(err) {

        logger.info("#index " + err);
        return process.exit();
      } 
     
      logger.info("#index - Finished succesfully")
      return process.exit();
    });

  });
}
else {

  logger.info("#index - environment variables not set")
  process.exit();
}
