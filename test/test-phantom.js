var  PhantomHelper  =  require('../helpers/phantom-helper')
var  PhantomFactory  =  require('../helpers/phantom-factory')
var  _  =  require('underscore')
var  assert  =  require('assert')



PhantomFactory.getPhantomInstace(function(err,  ph){
   if(!err){

   var  query  =  {
  	q:"from:@acerosalazar  since:2007-01-01  until:2015-10-05",
	src:"typd"
   };
  PhantomHelper.scrapeTweetsFromSearchResult(ph,  query,  function(err,tweets){
    if(!err){
      var  expectedTweets = 64;
      var  lastTweetId = "94818966895206400"  
      assert.equal(tweets.length,expectedTweets,"Did not retrieve the right amount of tweets");
      assert.equal(_.last(tweets).tweetId, lastTweetId, "Did not rertrieve all the authored tweets up to the last-one");
      console.log("All tests passsed!")  
      process.exit(1);
    }
  });
}
});
