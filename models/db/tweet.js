var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TweetSchema = new Schema({

  tweetId: {type:String, unique:true},
  text: String,
  location: String,
  timestamp: String,
  userId: String,
  date: Date,
  analyzedDbpedia:{type:Boolean, default:false},
  seed:{ type: Schema.Types.ObjectId, ref: 'seed' }
});

var Tweet = mongoose.model('tweet', TweetSchema);

exports = module.exports = Tweet;
