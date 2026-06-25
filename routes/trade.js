const router = require('express').Router();
const journalService = require('../services/journalService');
const riskManager = require('../services/riskManager');
const notificationService = require('../services/notificationService');
const db = require('../config/database');

/**
 * POST /api/trade
 * Execute a trade
 * 
 * Expected body:
 * {
 *   "symbol": "EURUSD",
 *   "direction": "BUY|SELL",
 *   "amount": 100,
 *   "confidence": 85,
 *   "strategySignal": "BUY",
 *   "entryPrice": 1.0850
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { symbol, direction, amount, confidence, strategySignal, entryPrice, aiRecommendation } = req.body;

    // Validate input
    if (!symbol || !direction || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: symbol, direction, amount'
      });
    }

    if (!['BUY', 'SELL'].includes(direction)) {
      return res.status(400).json({
        error: 'Invalid direction. Must be BUY or SELL'
      });
    }

    console.log(`[TRADE] ${direction} ${amount} ${symbol} at ${entryPrice || 'market'}`);

    // Validate risk
    const validation = await riskManager.validateTradeRisk({
      amount,
      confidence: confidence || 0
    });

    if (!validation.isValid) {
      console.warn('[TRADE REJECTED]', validation.errors);
      return res.status(400).json({
        error: 'Trade validation failed',
        errors: validation.errors,
        success: false
      });
    }

    // Create trade in database
    const trade = await journalService.addTrade({
      symbol,
      direction,
      entryPrice: entryPrice || null,
      amount,
      confidence: confidence || 0,
      strategySignal: strategySignal || null,
      aiRecommendation: aiRecommendation || null
    });

    console.log(`[TRADE OPENED] ID: ${trade.id}, ${direction} ${symbol}`);

    // Send notification
    await notificationService.notifyTradeOpen(trade);

    // Calculate stop loss and take profit
    const levels = riskManager.calculateLevels(
      entryPrice || 0,
      direction,
      confidence || 50
    );

    return res.json({
      success: true,
      message: 'Trade opened successfully',
      data: {
        ...trade,
        stopLoss: levels.stopLoss,
        takeProfit: levels.takeProfit
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[TRADE ERROR]', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
});

/**
 * POST /api/trade/:tradeId/close
 * Close a trade
 * 
 * Expected body:
 * {
 *   "exitPrice": 1.0900,
 *   "notes": "Hit take profit"
 * }
 */
router.post('/:tradeId/close', async (req, res) => {
  try {
    const { tradeId } = req.params;
    const { exitPrice, notes } = req.body;

    if (!exitPrice) {
      return res.status(400).json({
        error: 'Missing required field: exitPrice'
      });
    }

    // Close trade in database
    const closedTrade = await journalService.closeTrade(
      tradeId,
      exitPrice,
      notes || ''
    );

    console.log(`[TRADE CLOSED] ID: ${tradeId}, P&L: ${closedTrade.pnl}`);

    // Send notification
    await notificationService.notifyTradeClosed(closedTrade);

    return res.json({
      success: true,
      message: 'Trade closed successfully',
      data: closedTrade,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[TRADE CLOSE ERROR]', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/trade/:tradeId
 * Get trade details
 */
router.get('/:tradeId', async (req, res) => {
  try {
    const { tradeId } = req.params;

    const trade = await journalService.getTrade(tradeId);

    if (!trade) {
      return res.status(404).json({
        error: 'Trade not found'
      });
    }

    return res.json({
      success: true,
      data: trade
    });
  } catch (error) {
    console.error('[TRADE GET ERROR]', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/trade
 * List trades with filters
 */
router.get('/', async (req, res) => {
  try {
    const { symbol, status, limit = 50, startDate, endDate } = req.query;

    const trades = await journalService.getHistory({
      symbol,
      status,
      limit: parseInt(limit),
      startDate,
      endDate
    });

    return res.json({
      success: true,
      data: trades,
      count: trades.length
    });
  } catch (error) {
    console.error('[TRADE LIST ERROR]', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/trade/stats/overview
 * Get trading statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await riskManager.getStats();
    const dailyPnl = await riskManager.getDailyPnL();

    return res.json({
      success: true,
      data: {
        ...stats,
        dailyPnL: dailyPnl
      }
    });
  } catch (error) {
    console.error('[STATS ERROR]', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;
