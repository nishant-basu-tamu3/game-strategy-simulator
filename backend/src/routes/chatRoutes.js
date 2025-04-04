// backend/src/routes/chatRoutes.js
const express = require('express');
const Conversation = require('../models/Conversation');
const chatService = require('../services/ChatService');

const router = express.Router();

// Get conversations for a specific game
router.get('/game/:gameId', async (req, res) => {
  try {
    const userId = req.query.userId || 'user123'; // In a real app, get from auth
    const conversations = await Conversation.find({ 
      gameId: req.params.gameId,
      userId
    }).sort({ lastActivity: -1 });
    
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a specific conversation
router.get('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new conversation
router.post('/', async (req, res) => {
  try {
    const { gameId } = req.body;
    const userId = req.body.userId || 'user123'; // In a real app, get from auth
    
    const conversation = new Conversation({
      gameId,
      userId,
      startedAt: new Date(),
      lastActivity: new Date(),
      messages: [{
        // Don't include conversationId here
        message: "Hello! How can I help you with game strategies today?",
        isFromUser: false,
        timestamp: new Date()
      }]
    });
    
    // First save the conversation to get an ID
    const savedConversation = await conversation.save();
    
    // Now you can set the conversationId if needed
    if (savedConversation.messages && savedConversation.messages.length > 0) {
      savedConversation.messages[0].conversationId = savedConversation._id;
      await savedConversation.save();
    }
    
    res.status(201).json(savedConversation);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add a message to a conversation
router.post('/:id/messages', async (req, res) => {
  try {
    const { message } = req.body;
    
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    
    // Add user message
    conversation.messages.push({
      conversationId: conversation._id,
      message,
      isFromUser: true,
      timestamp: new Date()
    });
    
    // Update last activity
    conversation.lastActivity = new Date();
    
    // Process message using ChatService
    const responseText = await chatService.processMessage(conversation._id, message);
    
    // Add bot response
    conversation.messages.push({
      conversationId: conversation._id,
      message: responseText,
      isFromUser: false,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    // Return just the new messages
    const userMessageIndex = conversation.messages.length - 2;
    const responseMessageIndex = conversation.messages.length - 1;
    
    res.json({
      userMessage: conversation.messages[userMessageIndex],
      responseMessage: conversation.messages[responseMessageIndex]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;