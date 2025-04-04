// backend/src/models/Conversation.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatMessageSchema = new Schema({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation'
    // The required: true property has been removed
  },
  message: {
    type: String,
    required: true
  },
  isFromUser: {
    type: Boolean,
    default: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  gameId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Game'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  messages: [chatMessageSchema]
});

module.exports = mongoose.model('Conversation', conversationSchema);