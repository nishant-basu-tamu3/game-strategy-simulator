const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const gameSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  wikiBaseUrl: {
    type: String,
    required: true
  },
  categoryPaths: [{
    type: String
  }],
  iconUrl: {
    type: String
  }
});

module.exports = mongoose.model('Game', gameSchema);
