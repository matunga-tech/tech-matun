const router = require('express').Router();
const strategy = require('../services/strategyEngine');
const journalService = require('../services/journalService');
const notificationService = require('../services/notificationService');

/**
 * POST /api/scan
 * Scan market and get trading signal
 * 
 * Expected body:
 * {
 *   "symbol": "EURUSD",
 *   "adx": 35,
 *   "rsi": 28,
 *   "price": 1.0850
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { symbol, adx, rsi, price } = req.body;

    // Validate input
    if (!symbol || adx === undefined || rsi === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: symbol, adx, rsi',
        received: { symbol, adx, rsi }
      });
    }

    console.log(`[SCAN] ${symbol} - ADX: ${adx}, RSI: ${rsi}, Price: ${price}`);

    // Evaluate market
    const signal = await strategy.evaluate({
      symbol,
      adx,
      rsi,
      price
    });

    // Record signal in database
    await journalService.recordSignal({
      symbol,
      adx,
      rsi,
      price,
      signal: signal.signal,
      confidence: signal.confidence,
      aiEnhanced: signal.aiEnhanced,
      aiConfidence: signal.aiConfidence
    });

    // Send notification if signal confidence is high
    if (signal.confidence >= parseInt(process.env.MIN_CONFIDENCE || 70)) {
      await notificationService.notifySignal({
        symbol,
        signal: signal.signal,
        confidence: signal.confidence,
        adx,
        rsi,
        price
      });
    }

    return res.json({
      success: true,
      data: signal,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SCAN ERROR]', error);
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/scan/history
 * Get signal history
 */
router.get('/history', async (req, res) => {
  try {
    const { symbol, limit = 50 } = req.query;

    const history = await journalService.getSignalsHistory({
      symbol,
      limit: parseInt(limit)
    });

    return res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('[SCAN HISTORY ERROR]', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/scan/analysis
 * Get market analysis from AI
 */
router.get('/analysis', async (req, res) => {
  try {
    const { symbols = 'EURUSD,GBPUSD', timeframe = '1h' } = req.query;
    const aiGateway = require('../services/aiGateway');

    const analysis = await aiGateway.analyzeMarket({
      symbols: symbols.split(','),
      timeframe
    });

    return res.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ANALYSIS ERROR]', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;
