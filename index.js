

var mongoose = require('mongoose');
var _        = require("underscore");
var main     = require("./main");


// Retrive environment variables
var mongoProtocolHostAndPort  = process.env.MONGO_DB_PORT;
var mongoDB                   = process.env.SKE_DATABASE_NAME;
var crawlerStartDate          = process.env.SKE_CRAWLER_START_DATE;

// Check if environment variables have been set
if(!_.isUndefined(mongoProtocolHostAndPort) && !_.isUndefined(mongoDB) && !_.isUndefined(crawlerStartDate)){
  
  // Slice out the Protocol prefix - i.e tcp://
  var mongoHostAndPort = mongoProtocolHostAndPort.slice(_.lastIndexOf(mongoProtocolHostAndPort, "/") +1 );
  
  // Start database
  logger.debug('#index - Connecting to the database');
  mongoose.connect("mongodb://"+mongoHostAndPort+"/"+mongoDB);
  db = mongoose.connection; 
  
  db.once('open', function() {
    
    main.start(db, crawlerStartDate);
  });
}
else {

  logger.debug("#index - environment variables not set")
  process.exit();
}
