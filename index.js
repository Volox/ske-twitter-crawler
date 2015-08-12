

var mongoose = require('mongoose');
var _        = require("underscore");
var moment   = require("moment");
var logger   = require("./core/logger");
var main     = require("./core/main");
var StringUtilities = require("./utilities/string-utilities")

// Retrive environment variables
var mongo = {
  
  'protocolHostAndPort':process.env.MONGO_PORT,
  'dbName': process.env.SKE_DATABASE_NAME
};

var crawler = {
  'startDate': process.env.SKE_CRAWLER_START_DATE || '2006-03-21', // start crawling from the foundation date of twitter
  'endDate': process.env.SKE_CRAWLER_END_DATE || moment().format('YYYY-MM-DD'), // crawl until today
  'regex': new RegExp(process.env.SKE_CRAWLER_REGEX || '.*'), // Crawl for all the seeds in the db
  'parallelQueries': process.env.SKE_CRAWLER_PARALLEL_QUERIES || 1
};

var requiredVariables = [mongo.protocolHostAndPort, mongo.dbName, crawler.startDate, crawler.endDate, crawler.regex, crawler.parallelQueries];

// Check if environment variables have been set
if(StringUtilities.checkStringsNotEmpty(requiredVariables)){
  
  // Slice out the Protocol prefix - i.e tcp://
  mongo.hostAndPort = mongo.protocolHostAndPort.slice(_.lastIndexOf(mongo.protocolHostAndPort, "/") +1 );
  
  // Start database
  logger.info('#index - Connecting to the database: '+mongo.dbName + ' located at:' + mongo.hostAndPort);
  mongoose.connect("mongodb://"+mongo.hostAndPort+"/"+mongo.dbName);
  db = mongoose.connection; 
  
  db.once('open', function() {
    
    console.time('crawl-twitter');
    main.start(crawler, function(err, result){
	
      db.close();
      console.timeEnd('crawl-twitter');
      
      if(err) {
        
        logger.info("#index - Finshed with Error" + err);
        return process.exit(1);
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
