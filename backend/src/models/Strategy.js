const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const strategySchema = new Schema({
  gameId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Game'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  tags: [{
    type: String
  }],
  requirements: {
    type: Schema.Types.Mixed,
    default: {}
  },
  source: {
    type: String,
    required: true
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  }
});

strategySchema.index({ gameId: 1, tags: 1 });
strategySchema.index({ gameId: 1, title: 'text', description: 'text', content: 'text' });

module.exports = mongoose.model('Strategy', strategySchema);