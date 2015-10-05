var PhantomHelper = require('../helpers/phantom-helper')
var PhantomFactory = require('../helpers/phantom-factory')

PhantomFactory.getPhantomInstace(function(err, ph){
  if(!err){
    
    var query = "from:@acerosalazar since:2007-01-01 until:2015-10-05"
    PhantomHelper.scrapeTweetsFromSearchResult(ph, query, function(err,tweets){
        if(!err){
            console.log(tweets.lenght);
        }
    });
  }
});
