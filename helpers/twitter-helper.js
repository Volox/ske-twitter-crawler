
var phantom = require('phantom');
var cheerio = require('cheerio');
var async = require('async');
var _       = require("underscore");
var querystring = require("querystring");
var logger  = require('../core/logger');

// A utility function that parses the obtained HTML, and
// retrives all the useful information out of the found tweets
// @html - the html-subtree that contains the tweets to parse

var TwitterHelper = function(){

  this.retryOnceFlag = true;
};

TwitterHelper.prototype.parseTweetsFromHTML = function(html) {
  
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
    var url = 'https://twitter.com/search?';
    url = url + querystring.stringify(query);
    
    logger.info('#main - queryig twitter');
    
    phantom.create(function (ph) {
      
      ph.createPage(function (page) {
        
        page.open(url, function (status) {
          
          debugger;
          
          if(status === 'success'){
            
            self.retryOnceFlag = true;
            var html = undefined;

            async.during( 

              function(innerCallback){

                page.evaluate(function() {
                  
                  window.document.body.scrollTop = window.document.body.scrollTop + 10000;
                  var endTag = $('.stream-end');
                  return (endTag && endTag.css('display') !== 'none')?document.body.innerHTML:undefined;

                },function(result) {

                  html = result;
                  return innerCallback(null, _.isUndefined(html));
                });
              }, 
              function(innerCallback) {

                setTimeout(innerCallback, 1500); // wait 1.5 seconds to scroll down
              }, 
              function(err){
                
                ph.exit();
                var tweets = self.parseTweetsFromHTML(html);
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
};

exports = module.exports = TwitterHelper;