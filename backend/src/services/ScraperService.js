// backend/src/services/ScraperService.js
const axios = require('axios');
const cheerio = require('cheerio');
const Game = require('../models/Game');
const GameEntity = require('../models/GameEntity');
const Strategy = require('../models/Strategy');

class ScraperService {
  async scrapeGame(gameId) {
    try {
      // Get game info from database
      const game = await Game.findById(gameId);
      if (!game) {
        return { success: false, error: 'Game not found' };
      }
      
      console.log(`Scraping game: ${game.name}`);
      
      // Scrape each category defined for the game
      for (const categoryPath of game.categoryPaths) {
        try {
          await this.scrapeCategory(game, categoryPath);
        } catch (error) {
          console.error(`Error scraping category ${categoryPath}:`, error.message);
        }
      }
      
      return { success: true, message: `Scraped game: ${game.name}` };
    } catch (error) {
      console.error('Error in scrapeGame:', error);
      return { success: false, error: error.message };
    }
  }

  async scrapeCategory(game, categoryPath) {
    console.log(`Scraping category: ${categoryPath} for game: ${game.name}`);
    const pageUrls = await this.getCategoryPageUrls(game.wikiBaseUrl, categoryPath);
    
    for (const url of pageUrls) {
      try {
        await this.scrapePage(game, url, this.getCategoryType(categoryPath));
        // Sleep to be nice to the wiki servers
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
      }
    }
  }

  async getCategoryPageUrls(baseUrl, categoryPath) {
    const fullUrl = `${baseUrl}${categoryPath}`;
    const response = await axios.get(fullUrl);
    const $ = cheerio.load(response.data);
    
    const urls = [];
    $('.category-page__member-link').each((i, link) => {
      const href = $(link).attr('href');
      if (href) {
        urls.push(`${baseUrl}${href}`);
      }
    });
    
    return urls;
  }

  getCategoryType(categoryPath) {
    // Extract type from category path - customize per game later
    if (categoryPath.includes('Strategies') || categoryPath.includes('Strategy')) {
      return 'Strategy';
    } else if (categoryPath.includes('Troops') || categoryPath.includes('Troop')) {
      return 'Troop';
    } else if (categoryPath.includes('Buildings') || categoryPath.includes('Building')) {
      return 'Building';
    } else if (categoryPath.includes('Spells') || categoryPath.includes('Spell')) {
      return 'Spell';
    } else if (categoryPath.includes('Heroes') || categoryPath.includes('Hero')) {
      return 'Hero';
    } else {
      return 'Other';
    }
  }

  async scrapePage(game, url, type) {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Extract title
    const title = $('.page-header__title').text().trim();
    if (!title) return;
    
    // Extract content
    const content = $('.mw-parser-output').text().trim();
    
    // Extract properties
    const properties = {};
    $('.infobox tr').each((i, row) => {
      const header = $(row).find('th').text().trim();
      const data = $(row).find('td').text().trim();
      
      if (header && data) {
        properties[header] = data;
      }
    });
    
    if (type === 'Strategy') {
      // Save as strategy
      const strategy = {
        gameId: game._id,
        title,
        description: content.substring(0, 200) + '...',
        content,
        tags: [], // Could extract tags from content or categories
        source: url,
        scrapedAt: new Date()
      };
      
      const strategyDoc = new Strategy(strategy);
      await strategyDoc.save();
    } else {
      // Save as game entity
      const entity = {
        gameId: game._id,
        name: title,
        type,
        description: content.substring(0, 200) + '...',
        wikiUrl: url,
        properties,
        content,
        scrapedAt: new Date()
      };
      
      const entityDoc = new GameEntity(entity);
      await entityDoc.save();
    }
    
    console.log(`Scraped and saved: ${title} (${type})`);
  }
  
  // Add game-specific scrapers as methods
  async setupClashOfClans() {
    const gameData = {
      name: "Clash of Clans",
      description: "A mobile strategy game where players build villages, train troops, and attack other players.",
      wikiBaseUrl: "https://clashofclans.fandom.com",
      categoryPaths: [
        "/wiki/Category:Troops",
        "/wiki/Category:Buildings",
        "/wiki/Category:Spells",
        "/wiki/Category:Heroes"
      ],
      iconUrl: "https://play-lh.googleusercontent.com/LByrur1mTmPeNr0ljI-uAUcct1rzmTve5Esau1SwoAzjBXQUby6uHIfHbHWT83wU7g"
    };
    
    // Check if game already exists
    let game = await Game.findOne({ name: gameData.name });
    
    if (!game) {
      game = new Game(gameData);
      await game.save();
      console.log(`Created game: ${gameData.name}`);
    }
    
    return game;
  }
  
  // You can add more games with their specific setup
  async setupEldenRing() {
    const gameData = {
      name: "Elden Ring",
      description: "An action RPG developed by FromSoftware and published by Bandai Namco Entertainment.",
      wikiBaseUrl: "https://eldenring.wiki.fextralife.com",
      categoryPaths: [
        "/wiki/Weapons",
        "/wiki/Armor",
        "/wiki/Bosses",
        "/wiki/NPCs"
      ],
      iconUrl: "https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg"
    };
    
    let game = await Game.findOne({ name: gameData.name });
    
    if (!game) {
      game = new Game(gameData);
      await game.save();
      console.log(`Created game: ${gameData.name}`);
    }
    
    return game;
  }
}

module.exports = new ScraperService();