var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TweetSchema = new Schema({

  tweetId: String,//{type:String, unique:true},
  text: String,
  location: String,
  timestamp: String,
  userId: String,
  date: Date,
  seed:{ type: Schema.Types.ObjectId, ref: 'seed' }
});

var Tweet = mongoose.model('tweet', TweetSchema);

exports = module.exports = Tweet;