const express = require('express');
const scraperService = require('../services/ScraperService');

const router = express.Router();

// Setup initial games
router.post('/setup', async (req, res) => {
  try {
    const cocGame = await scraperService.setupClashOfClans();
    const eldenRingGame = await scraperService.setupEldenRing();
    
    res.json({ 
      success: true, 
      games: [
        { id: cocGame._id, name: cocGame.name },
        { id: eldenRingGame._id, name: eldenRingGame.name }
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Scrape a specific game
router.post('/scrape/:gameId', async (req, res) => {
  try {
    const result = await scraperService.scrapeGame(req.params.gameId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;