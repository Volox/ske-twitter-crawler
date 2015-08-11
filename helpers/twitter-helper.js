
var phantom = require('phantom');
var cheerio = require('cheerio');
var async = require('async');
var _       = require("underscore");
var querystring = require("querystring");
var port = require('portastic');
var logger  = require('../core/logger');

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

TwitterHelper.prototype.findAvailablePort = function(callback){
   
   var options = {
  	min:10000,
  	max:60000,
  	retrieve:1
   }; 
   return port.find(options, callback);
};

TwitterHelper.prototype.scrapeTweetsFromSearchResult = function(query, callback) {
   
    var self = this;
    
    self.findAvailablePort(function(err, p){
      debugger;
      if(err) {

        logger.error('#twitter-helper - Could not find an available port - ' +  err);
        return callback(err);
      }
      else {

        var url = 'https://twitter.com/search?';
        url = url + querystring.stringify(query);
        
        logger.info('#twitter-helper - queryig twitter through port:' + p);
        
        // create a new phantom process using a new available port
        phantom.create('', { 
          port:p, 
          onExit:function(errorCode){
          	
            // manage child-process crashes
          	if(errorCode > 0){ 
                
                // manage first error by re-attempting
                if(self.retryOnceFlag){
              		
                  self.retryOnceFlag = false;
              		logger.info('#twitter-helper - phantom process has crashed. Trying once again ');
              		return self.scrapeTweetsFromSearchResult(query, callback);  
          	    }
          	     // manage second error by skipping the query
                else {
                  logger.error('#twitter-helper - phantom process crashed twice with the same query, Skiping query');
                  return callback(null, []);
          	    }
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
