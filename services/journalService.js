const db = require('../config/database');

/**
 * Trade Journal Service - Log and retrieve trades
 */

class JournalService {
  /**
   * Add a new trade to the journal
   */
  static async addTrade(trade) {
    try {
      const {
        symbol,
        direction,
        entryPrice,
        amount,
        confidence,
        strategySignal,
        aiRecommendation
      } = trade;

      const result = await db.query(
        `INSERT INTO trades 
         (symbol, direction, entry_price, amount, confidence, strategy_signal, ai_recommendation, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN')
         RETURNING *`,
        [symbol, direction, entryPrice, amount, confidence, strategySignal, aiRecommendation]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error adding trade:', error);
      throw error;
    }
  }

  /**
   * Close a trade with P&L
   */
  static async closeTrade(tradeId, exitPrice, notes = '') {
    try {
      const tradeResult = await db.query(
        'SELECT * FROM trades WHERE id = $1',
        [tradeId]
      );

      if (tradeResult.rows.length === 0) {
        throw new Error('Trade not found');
      }

      const trade = tradeResult.rows[0];
      
      // Calculate P&L
      let pnl;
      if (trade.direction === 'BUY') {
        pnl = (exitPrice - trade.entry_price) * trade.amount;
      } else {
        pnl = (trade.entry_price - exitPrice) * trade.amount;
      }

      const result = await db.query(
        `UPDATE trades 
         SET status = 'CLOSED', pnl = $1, closed_at = NOW(), notes = $2
         WHERE id = $3
         RETURNING *`,
        [parseFloat(pnl.toFixed(2)), notes, tradeId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error closing trade:', error);
      throw error;
    }
  }

  /**
   * Get trade history
   */
  static async getHistory(filters = {}) {
    try {
      let query = 'SELECT * FROM trades WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (filters.symbol) {
        query += ` AND symbol = $${paramCount}`;
        params.push(filters.symbol);
        paramCount++;
      }

      if (filters.status) {
        query += ` AND status = $${paramCount}`;
        params.push(filters.status);
        paramCount++;
      }

      if (filters.startDate) {
        query += ` AND created_at >= $${paramCount}`;
        params.push(filters.startDate);
        paramCount++;
      }

      if (filters.endDate) {
        query += ` AND created_at <= $${paramCount}`;
        params.push(filters.endDate);
        paramCount++;
      }

      query += ' ORDER BY created_at DESC';
      
      if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  /**
   * Get trade by ID
   */
  static async getTrade(tradeId) {
    try {
      const result = await db.query(
        'SELECT * FROM trades WHERE id = $1',
        [tradeId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting trade:', error);
      return null;
    }
  }

  /**
   * Get today's trades
   */
  static async getTodaysTrades() {
    try {
      const result = await db.query(
        `SELECT * FROM trades 
         WHERE DATE(created_at) = CURRENT_DATE
         ORDER BY created_at DESC`
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting today\'s trades:', error);
      return [];
    }
  }

  /**
   * Get summary statistics
   */
  static async getSummary() {
    try {
      const result = await db.query(
        `SELECT 
          COUNT(*) as total_trades,
          COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades,
          COUNT(CASE WHEN pnl < 0 THEN 1 END) as losing_trades,
          ROUND(COUNT(CASE WHEN pnl > 0 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as win_rate,
          ROUND(SUM(pnl), 2) as total_pnl,
          ROUND(AVG(pnl), 2) as avg_pnl,
          ROUND(MAX(pnl), 2) as best_trade,
          ROUND(MIN(pnl), 2) as worst_trade,
          ROUND(AVG(confidence), 0) as avg_confidence
         FROM trades
         WHERE status = 'CLOSED'`
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error getting summary:', error);
      return {};
    }
  }

  /**
   * Add signal to signals table for historical tracking
   */
  static async recordSignal(signalData) {
    try {
      const { symbol, adx, rsi, price, signal, confidence, aiEnhanced, aiConfidence } = signalData;

      const result = await db.query(
        `INSERT INTO signals 
         (symbol, adx, rsi, price, signal, confidence, ai_enhanced, ai_confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [symbol, adx, rsi, price, signal, confidence, aiEnhanced || false, aiConfidence || null]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error recording signal:', error);
      return null;
    }
  }

  /**
   * Get signals history
   */
  static async getSignalsHistory(filters = {}) {
    try {
      let query = 'SELECT * FROM signals WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (filters.symbol) {
        query += ` AND symbol = $${paramCount}`;
        params.push(filters.symbol);
        paramCount++;
      }

      if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      query += ' ORDER BY created_at DESC';

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting signals history:', error);
      return [];
    }
  }
}

module.exports = JournalService;
