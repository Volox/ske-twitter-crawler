
var phantom = require('phantom');
var cheerio = require('cheerio');
var async = require('async');
var mongoose = require('mongoose');
var _       = require("underscore");
var querystring = require("querystring");
var freeport = require('freeport');
var logger  = require('../core/logger');

phantom.stderrHandler = function (error) {
    
   if (error.match(/(No such method.*socketSentData)|(CoreText performance note)/)) {
        return;
    }
   logger.error('#twitter-helper - Phantom has crashed - ' +  error);
   logger.errir('#twitter-helper - Exiting with error code = 0');
   mongoose.connection.close();
   process.exit(1);

};


var TwitterHelper = function(){

  this.retryOnceFlag = true;
};

TwitterHelper.prototype.parseTweetsFromHTML = function(html) {
  
  if(_.isUndefined(html)){
    return undefined;
  }

  var $ = cheerio.load(html);

  var $tweets = $("#stream-items-id .tweet");

  var tweets = _.map($tweets, function(element) {

    var $tweet = $(element);

    // Retrieving the id
    var id = $tweet.attr('data-tweet-id');

    // Retrieving the text
    var text = $tweet.find('.tweet-text').text();

    // Retrieving the account
    var $account = $tweet.find('.account-group');
    var userId = $account.attr('data-user-id');

    // Retrieving the account
    var $timestamp = $tweet.find('._timestamp');
    var timestamp = $timestamp.attr('data-time');

    // Retrieving the geolocalization
    var $geo = $tweet.find('.ProfileTweet-geo');
    var geo;
    if ($geo.length !== 0) {
      geo = $geo.attr('data-original-title') || $geo.attr('title') || $geo.find('.u-hiddenVisually').text();
    }

    return {
      tweetId: id,
      text: text,
      userId: userId,
      timestamp: timestamp,
      location: geo
    };
  });

  return tweets;
};

TwitterHelper.prototype.scrapeTweetsFromSearchResult = function(query, callback) {
   
    var self = this;
    
   freeport(function(err, port){
      
      if(err) {

        logger.error('#twitter-helper - Could not find an available port - ' +  err);
        return callback(err);
      }
      else {

        var url = 'https://twitter.com/search?';
        url = url + querystring.stringify(query);
        
        logger.info('#twitter-helper - Querying twitter with phatom. Attempting IPC through port:' + port);
        
        // create a new phantom process using a new available port
        phantom.create({ 
          port:port, 
          onExit:function(errorCode){
          	
		logger.info('#twitter-helper - Phantom exit with code '+errorCode);
                // manage child-process crashes
		if(_.isUndefined(errorCode) || errorCode !== 0){              		
                  logger.error('#twitter-helper - phantom process crashed - ' + errorCode);
                  //return callback(null, []);
          	  process.exit(1);
                }
         }
        },function (ph) {
          
          ph.createPage(function (page) {
            
            page.onConsoleMessage = function(msg) {
              
              logger.info('#twitter-helper - ' + msg);
            };

            page.open(url, function (status) {
              
              if(status === 'success'){
                
                self.retryOnceFlag = true;
                var html = undefined;

                async.during( 

                  function(innerCallback){

                    page.evaluate(function() {
                     
                      window.document.body.scrollTop = window.document.body.scrollTop + 10000;
                      var endTag = $('.stream-end');
                      return (endTag && endTag.css('display') !== 'none')? document.body.innerHTML:undefined;

                    },function(result) {

                      html = result;
                      return innerCallback(null, _.isUndefined(html));
                    });
                  }, 
                  function(innerCallback) {
                    logger.info('#twitter-helper - scrolling down');
                    setTimeout(innerCallback, 1500); // wait 1.5 seconds to scroll down
                  }, 
                  function(err){
                    
                    ph.exit();
                    var tweets = self.parseTweetsFromHTML(html) || [];
                    logger.info('#twitter-helper - Retrieved ' + tweets.length + ' tweets');
                    return callback(null, tweets);
                  }
                );
              }
              else { 
                
                if(self.retryOnceFlag){

                  ph.exit();
                  self.retryOnceFlag = false;
                  logger.info('#twitter-helper - page.open returned : ' +  status + ' retrying once more');
                  return self.scrapeTweetsFromSearchResult(query, callback);  
                } 
                else {

                    ph.exit();
                    logger.error('#twitter-helper - page.open returned : ' +  status + ' twice');
                    return callback(null, []);
                }
              }

            });
          });
        });
      }
    });
};

exports = module.exports = TwitterHelper;
