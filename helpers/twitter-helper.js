
var phantom = require('phantom');
var cheerio = require('cheerio');
var _       = require("underscore");
var querystring = require("querystring");
var logger  = require('../core/logger.js');

// A utility function that parses the obtained HTML, and
// retrives all the useful information out of the found tweets
// @html - the html-subtree that contains the tweets to parse
var parseTweetsFromHTML = function(html) {
  
  var $ = cheerio.load(html);

  var $tweets = $("#stream-items-id .tweet");

  logger.info('#twitter-helper - Retrieved ' + $tweets.length + ' tweets');

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

exports = module.exports = {

  // Async method. Navigates to the given URL parsing 
  // HTML the elements with a .tweet class. The function also
  // scrolls the page every 15000 ms.
  // @url - The twitter URL that should be scraped
  // @callback - A function that receives (error, result) parameters.
  scrapeTweetsFromSearchResult : function(query, callback) {
  
    var url = 'https://twitter.com/search?';
    url = url + querystring.stringify(query);

    logger.info('#crawler - querying the web');

    phantom.create(function(ph) {
      
      logger.info('#crawler - Initalizing phantom');
      
      ph.createPage(function(page) {
        
        logger.info('#twitter-helper - Creating the page');

        page.onConsoleMessage = function(msg) {
          
          logger.info("#twitter-helper - " + msg);
        };

        page.open(url, function(status) {

          logger.info("#twitter-helper - Opened page? ", status);

          if(status === "success") {

            var interval = setInterval(function() {

              page.evaluate(function() {
                window.document.body.scrollTop = window.document.body.scrollTop + 10000;

                var count = $("#stream-items-id .tweet").length;
                var endTag = $('.stream-end');
                var end = false;
                if (endTag) {
                  end = (endTag.css('display') !== 'none');
                }
                var html = document.body.innerHTML;

                return {
                  count: count,
                  html: html,
                  end: end
                };

              }, function(result) {
                if (result.end) {
                  
                  logger.info('#twitter-helper - Finished scrolling');
                  clearInterval(interval);
                  logger.info('#twitter-helper - Exiting from phantom');
                  ph.exit();

                  var tweets = parseTweetsFromHTML(result.html);
                  return callback(null, tweets);
                } else {
                  logger.info('#twitter-helper - Need to go on');
                }
              });

            }, 1500); // Number of milliseconds to wait between scrolls
          }
          else { 
            var error = new Error('Phantom Error. page.open returned : ' +  status);
            logger.error("#twitter-helper - " + error);
            return callback(error, null);
          }
        });
      });
    });
  }

};