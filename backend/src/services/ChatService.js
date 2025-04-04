// backend/src/services/ChatService.js
const GameEntity = require('../models/GameEntity');
const Conversation = require('../models/Conversation');
const Groq = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
  apiKey: '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',
  dangerouslyAllowBrowser: false // Set to false for server-side usage
});

class ChatService {
  async processMessage(conversationId, message) {
    // Get the conversation to find its associated game
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    const gameId = conversation.gameId;
    
    // Step A: Retrieve relevant game entities (RAG component)
    const relevantEntities = await this.retrieveRelevantEntities(gameId, message);
    
    // Step B: Format entity information for the LLM
    const entityContext = this.formatEntityContext(relevantEntities);
    
    // Step C: Send to LLM with appropriate prompt
    const llmResponse = await this.queryLLM(message, entityContext, conversation.messages);
    
    return llmResponse;
  }
  
  async retrieveRelevantEntities(gameId, query) {
    // Extract potential keywords from the query
    const keywords = this.extractKeywords(query);
    
    // Create a search query using the keywords
    if (keywords.length === 0) {
      // Default search if no keywords found
      return await GameEntity.find({ gameId })
                            .sort({ name: 1 })
                            .limit(5);
    }
    
    // Advanced: Map keywords to entity types for better search
    const typeKeywords = {
      troop: ['troop', 'army', 'soldier', 'unit', 'attack'],
      spell: ['spell', 'magic', 'potion'],
      building: ['building', 'structure', 'defense', 'tower', 'wall'],
      hero: ['hero', 'champion', 'special', 'unique']
    };
    
    // Determine if query is about a specific entity type
    let entityType = null;
    for (const [type, typeWords] of Object.entries(typeKeywords)) {
      if (typeWords.some(word => query.toLowerCase().includes(word))) {
        entityType = type.charAt(0).toUpperCase() + type.slice(1); // Capitalize
        break;
      }
    }
    
    // Create search conditions for MongoDB
    const searchConditions = keywords.map(keyword => ({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { 'properties.description': { $regex: keyword, $options: 'i' } }
      ]
    }));
    
    // Build query
    const searchQuery = { gameId };
    
    if (searchConditions.length > 0) {
      searchQuery.$or = searchConditions;
    }
    
    if (entityType) {
      searchQuery.type = entityType;
    }
    
    // Execute search
    let entities = await GameEntity.find(searchQuery).limit(5);
    
    // If no results with specific search, fall back to broader search
    if (entities.length === 0) {
      const broaderQuery = { gameId };
      if (entityType) broaderQuery.type = entityType;
      
      entities = await GameEntity.find(broaderQuery)
                               .sort({ name: 1 })
                               .limit(5);
    }
    
    return entities;
  }
  
  extractKeywords(query) {
    // Remove common words and punctuation
    const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'and', 'in', 'that', 'have', 'it', 'for', 'on', 'with', 'as', 'do', 'at', 'this', 'by', 'from', 'or', 'about', 'how', 'what', 'which', 'when', 'where', 'who', 'why'];
    
    const words = query.toLowerCase()
                    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
                    .split(/\s+/)
                    .filter(word => word.length > 3 && !stopWords.includes(word));
                    
    return [...new Set(words)]; // Remove duplicates
  }
  
  formatEntityContext(entities) {
    // Format entity information for the LLM context
    let context = "Here's information about relevant game entities:\n\n";
    
    entities.forEach(entity => {
      // Clean up content
      const name = entity.name.split('/')[0].trim();
      const type = entity.type;
      
      // Clean wiki formatting
      let description = this.cleanWikiContent(entity.content || entity.description);
      if (description.length > 300) {
        description = description.substring(0, 300) + '...';
      }
      
      // Format properties if available
      let propertiesText = '';
      if (entity.properties && Object.keys(entity.properties).length > 0) {
        propertiesText = "Properties:\n";
        for (const [key, value] of Object.entries(entity.properties)) {
          if (key !== 'description' && key !== 'name' && key !== 'type') {
            propertiesText += `- ${key}: ${value}\n`;
          }
        }
      }
      
      // Add to context
      context += `--- ${name} (${type}) ---\n`;
      context += `${description}\n`;
      if (propertiesText) {
        context += `${propertiesText}\n`;
      }
      context += '\n';
    });
    
    return context;
  }
  
  async queryLLM(userQuery, entityContext, conversationHistory) {
    try {
      // Format conversation history for context
      const historyContext = this.formatConversationHistory(conversationHistory);
      
      // Create system prompt
      const systemPrompt = `You are an expert game strategy advisor for Clash of Clans. 
You provide helpful, accurate, and strategic advice to players.
Use the provided game information to inform your responses, but don't explicitly mention the data source.
Present information in a clear, conversational way. If you don't know something, admit it rather than making up information.
When discussing strategy, consider both offensive and defensive aspects of the game.
If the user asks for a simulation, describe a hypothetical scenario and outcome based on the game mechanics.`;

      // Call Groq API
      const response = await groq.chat.completions.create({
        messages: [
          { 
            role: 'system', 
            content: systemPrompt 
          },
          { 
            role: 'user', 
            content: `${historyContext}\n\nRelevant Game Information:\n${entityContext}\n\nUser Question: ${userQuery}` 
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 500
      });
      
      // Extract and return the response text
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error querying LLM:', error);
      // Fallback response if API call fails
      return `I'm sorry, I'm having trouble processing your request. ${this.generateBasicResponse(userQuery, entityContext)}`;
    }
  }
  
  formatConversationHistory(messages) {
    // Extract just the last few messages to provide context
    const recentMessages = messages.slice(-6); // Last 6 messages
    
    let history = "Previous conversation:\n";
    recentMessages.forEach(msg => {
      const role = msg.isFromUser ? "User" : "Assistant";
      history += `${role}: ${msg.message}\n`;
    });
    
    return history;
  }
  
  generateBasicResponse(userQuery, entityContext) {
    // Fallback response generation if LLM call fails
    // This is a simplified template-based approach
    
    if (userQuery.toLowerCase().includes('strategy')) {
      return "For an effective strategy, consider balancing your offensive and defensive capabilities. Would you like specific advice on attack or defense?";
    } else if (userQuery.toLowerCase().includes('upgrade')) {
      return "Upgrading your buildings and troops in the right order is key to successful progression. Generally, focus on offensive capabilities first.";
    } else if (userQuery.toLowerCase().includes('attack')) {
      return "When attacking, it's important to scout the enemy base and plan accordingly. Look for weaknesses in their defense layout.";
    } else {
      return "I can provide strategy advice, upgrade recommendations, and gameplay tips. What specific aspect of the game are you interested in?";
    }
  }
  
  cleanWikiContent(content) {
    if (!content) return '';
    
    // Remove wiki formatting
    let clean = content
      .replace(/\[\[.*?\]\]/g, '') // Remove [[wiki links]]
      .replace(/\{\{.*?\}\}/g, '') // Remove {{templates}}
      .replace(/File:.*?\|.*?\|link=\]\]/g, '') // Remove file links
      .replace(/==.*?==/g, '') // Remove section headers
      .replace(/\n+/g, ' ') // Replace multiple newlines with space
      .trim();
      
    return clean;
  }
}

module.exports = new ChatService();