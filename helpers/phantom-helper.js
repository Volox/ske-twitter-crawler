
var phantom = require('phantom');
var async = require('async');
var querystring = require('querystring');
var CheerioHelper = require('cheerio-helper');
var logger  = require('../core/logger');

exports = module.exports = {
  
  retryOnceFlag:true,
  
  scrapeTweetsFromSearchResult : function(ph, query, callback) {
   
    var self = this;
    var url = 'https://twitter.com/search?';
    url = url + querystring.stringify(query);

    ph.createPage(function (page) {

      page.set('settings.loadImages', false)

      page.open(url, function (status) {
        
        if(status === 'success'){
          
          self.retryOnceFlag = true;

          // the code in this method acts as if it was within the loaded page
          page.evaluate(function() {
              
              // A throttled function used to scroll down the page every 1.5 seconds
              var scrollDown = function(){
                
                window.document.body.scrollTop = window.document.body.scrollTop + 10000;              
                var tag = document.querySelector('.stream-end')
                if(tag && getComputedStyle(tag).getPropertyValue('display') === 'none'){
                  
                  setTimeout(scrollDown, 1500); 

                }  else{
                  
                  // Returns undefined if the stream-end tag was not found. Returns loaded HTML in any other case
                  return (tag === null)? undefined: window.document.body.innerHTML
                }
              };
              
              return scrollDown();             
             
          }, function(result) {

              var tweets = CheerioHelper.parseTweetsFromHTML(result) || [];
              logger.info('#twitter-helper - Retrieved ' + tweets.length + ' tweets');
              
              page.release();
              page = null;
              return callback(null, tweets);
          });
        }
        else { 
          
          // Checks whether the operation has failed before
          if(self.retryOnceFlag){

            // Free's up memory
            page.release();
            page = null;

            self.retryOnceFlag = false;
            logger.info('#twitter-helper - page.open returned : ' +  status + '. Attemptin once more');
            return self.scrapeTweetsFromSearchResult(ph, query, callback);  
          } 
          else {
            
            // Free's up memory
            page.release();
            page = null;

            logger.error('#twitter-helper - page.open returned : ' +  status + ' twice');
            return callback(null, []);
          }
        }
      });

    });
  },
};
