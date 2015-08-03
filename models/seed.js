var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SeedSchema = new Schema({

  twitter: [{type:String, unique:true}],
  entityId: String,
  entityName: String
});

var Tweet = mongoose.model('seed', TweetSchema);

exports = module.exports = Seed;