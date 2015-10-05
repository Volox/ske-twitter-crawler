
var cheerio = require('cheerio');
var _       = require("underscore");

exports = module.exports = {

	parseTweetsFromHTML: function(html) {
  
    if(_.isUndefined(html) || _.isNull(html)){
      return undefined;
    }

    var $ = cheerio.load(html);

    var $tweets = $("#stream-items-id .tweet");

    var tweets = _.map($tweets, function(element) {

      var $tweet = $(element);

      // retrieves the id
      var id = $tweet.attr('data-tweet-id');

      // retrieves the text
      var text = $tweet.find('.tweet-text').text();

      // retrieves the account
      var $account = $tweet.find('.account-group');
      var userId = $account.attr('data-user-id');

      // retrieves the account
      var $timestamp = $tweet.find('._timestamp');
      var timestamp = $timestamp.attr('data-time');

      // retrieves the geolocalization
      var $geo = $tweet.find('.ProfileTweet-geo');
      var geo;
      if ($geo.length !== 0) {
        geo = $geo.attr('data-original-title') || $geo.attr('title') || $geo.find('.u-hiddenVisually').text();
      }

      // releases references to the html elements
      $geo = null;
      $timestamp = null;
      $account = null;
      $tweet = null;

      // creates a compact object with the extracted info
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
}