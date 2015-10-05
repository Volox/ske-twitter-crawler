var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SeedSchema = new Schema({
  
  crawled: {type:Boolean, default:false},
  twitter: [{type:String, unique:true}],
  entityId: String,
  entityName: String

});

var Seed = mongoose.model('seed', SeedSchema);

exports = module.exports = Seed;
