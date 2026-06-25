const router = require('express').Router();
const journalService = require('../services/journalService');

/**
 * GET /api/journal
 * Get trade journal/history
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
      count: trades.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[JOURNAL ERROR]', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/journal/today
 * Get today's trades
 */
router.get('/today', async (req, res) => {
  try {
    const trades = await journalService.getTodaysTrades();

    return res.json({
      success: true,
      data: trades,
      count: trades.length,
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('[JOURNAL TODAY ERROR]', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/journal/summary
 * Get trading summary statistics
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await journalService.getSummary();

    return res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[JOURNAL SUMMARY ERROR]', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/journal/:id
 * Get single trade details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const trade = await journalService.getTrade(id);

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
    console.error('[JOURNAL GET ERROR]', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/journal/signals/history
 * Get signal history
 */
router.get('/signals/history', async (req, res) => {
  try {
    const { symbol, limit = 50 } = req.query;

    const signals = await journalService.getSignalsHistory({
      symbol,
      limit: parseInt(limit)
    });

    return res.json({
      success: true,
      data: signals,
      count: signals.length
    });
  } catch (error) {
    console.error('[SIGNALS HISTORY ERROR]', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;
