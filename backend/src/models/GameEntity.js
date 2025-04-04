const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const gameEntitySchema = new Schema({
  gameId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Game'
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  wikiUrl: {
    type: String,
    required: true
  },
  properties: {
    type: Map,
    of: String,
    default: {}
  },
  content: {
    type: String
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  }
});


// Create compound index for faster queries
gameEntitySchema.index({ gameId: 1, type: 1 });
gameEntitySchema.index({ gameId: 1, name: 'text' });

module.exports = mongoose.model('GameEntity', gameEntitySchema);