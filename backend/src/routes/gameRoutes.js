// backend/src/routes/gameRoutes.js
const express = require('express');
const Game = require('../models/Game');
const GameEntity = require('../models/GameEntity');
const Strategy = require('../models/Strategy');

const router = express.Router();

// Get all games
router.get('/', async (req, res) => {
  try {
    const games = await Game.find();
    res.json(games);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a specific game
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }
    res.json(game);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get entities for a specific game
router.get('/:gameId/entities', async (req, res) => {
  try {
    const { type } = req.query;
    const query = { gameId: req.params.gameId };
    
    if (type) {
      query.type = type;
    }
    
    const entities = await GameEntity.find(query);
    res.json(entities);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search entities for a specific game
router.get('/:gameId/entities/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }
    
    const entities = await GameEntity.find({
      gameId: req.params.gameId,
      $text: { $search: q }
    });
    
    res.json(entities);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get strategies for a specific game
router.get('/:gameId/strategies', async (req, res) => {
  try {
    const strategies = await Strategy.find({ gameId: req.params.gameId });
    res.json(strategies);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search strategies for a specific game
router.get('/:gameId/strategies/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }
    
    const strategies = await Strategy.find({
      gameId: req.params.gameId,
      $text: { $search: q }
    });
    
    res.json(strategies);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
