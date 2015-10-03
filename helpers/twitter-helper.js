
var phantom = require('phantom');
var cheerio = require('cheerio');
var async = require('async');
var mongoose = require('mongoose');
var _       = require("underscore");
var querystring = require("querystring");
var freeport = require('freeport');
var logger  = require('../core/logger');

exports = module.exports = {
  
  retryOnceFlag:true,
  
  parseTweetsFromHTML: function(html) {
  
    if(_.isUndefined(html) || _.isNull(html)){
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

      $geo = null;
      $timestamp = null;
      $account = null;
      $tweet = null;

      return {
        tweetId: id,
        text: text,
        userId: userId,
        timestamp: timestamp,
        location: geo
      };
    });

    return tweets;
  },

  scrapeTweetsFromSearchResult : function(ph, query, callback) {
   
    var self = this;
    var url = 'https://twitter.com/search?';
    url = url + querystring.stringify(query);

    ph.createPage(function (page) {

      page.set('settings.loadImages', false)

      page.open(url, function (status) {
        
        if(status === 'success'){
          
          self.retryOnceFlag = true;
          var html = undefined;

          async.during( 

            // Async Function
            function(innerCallback){

              page.evaluate(function() {
               
                // scrolls the page 10000 pixels
                window.document.body.scrollTop = window.document.body.scrollTop + 10000;
                
                // loads the HTML into cheerio
                var $ = cheerio.load(window.document.body.innerHTML);
                
                // checks whether we have reached the end of the twitter-stream
                var endTag = $('.stream-end');

                // if we have reached the end of the stream it returns the whole HTML, otherwise it returns undefined
                return (endTag && endTag.css('display') !== 'none')? window.document.body.innerHTML:undefined;

              },function(result) {

                // invokes the test-callback passing the outcome of the test html===undefined
                html = result;
                return innerCallback(null, _.isUndefined(html));
              });
            }, 
            // Test Function
            function(innerCallback) {
              
              // Waits 1.5 seconds to invoke the Async Funciton, and scroll down the page
              logger.info('#twitter-helper - scrolling down');
              setTimeout(innerCallback, 1500); 
            }, 
            // Complete Function
            function(err){
              
              var tweets = self.parseTweetsFromHTML(html) || [];
              logger.info('#twitter-helper - Retrieved ' + tweets.length + ' tweets');
              
              page.release();
              page = null;
              html = null;
              return callback(null, tweets);
            }
          );
        }
        else { 
          
          if(self.retryOnceFlag){
            
            //page.close();
            page.release();
            page = null;
            //ph.exit();
            self.retryOnceFlag = false;
            logger.info('#twitter-helper - page.open returned : ' +  status + ' retrying once more');
            return self.scrapeTweetsFromSearchResult(ph, query, callback);  
          } 
          else {
            //page.close();
            page.release();
            page = null;
            //ph.exit();
            logger.error('#twitter-helper - page.open returned : ' +  status + ' twice');
            return callback(null, []);
          }
        }
      });
    });
  },
};
