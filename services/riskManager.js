const db = require('../config/database');

/**
 * Risk Manager - Calculate position sizing and validate risk
 */

class RiskManager {
  /**
   * Calculate position size based on account balance and risk percentage
   */
  static positionSize(balance, riskPct = null) {
    const riskPercentage = riskPct || parseFloat(process.env.RISK_PER_TRADE || 0.01);
    return +(balance * riskPercentage).toFixed(2);
  }

  /**
   * Calculate position size with stop loss
   */
  static positionSizeWithStopLoss(balance, entryPrice, stopLossPrice, riskPct = null) {
    const riskPercentage = riskPct || parseFloat(process.env.RISK_PER_TRADE || 0.01);
    const riskAmount = balance * riskPercentage;
    
    const stopLossPips = Math.abs(entryPrice - stopLossPrice);
    if (stopLossPips === 0) {
      return this.positionSize(balance, riskPct);
    }

    return Math.floor(riskAmount / stopLossPips);
  }

  /**
   * Check if daily loss limit exceeded
   */
  static async isDailyLossLimitExceeded() {
    try {
      const result = await db.query(`
        SELECT SUM(pnl) as daily_pnl
        FROM trades
        WHERE DATE(created_at) = CURRENT_DATE
        AND status = 'CLOSED'
      `);

      const dailyPnl = result.rows[0]?.daily_pnl || 0;
      const maxDailyLoss = -Math.abs(parseFloat(process.env.MAX_DAILY_LOSS || 0.05) * parseFloat(process.env.ACCOUNT_BALANCE || 1000));

      return dailyPnl < maxDailyLoss;
    } catch (error) {
      console.error('Error checking daily loss limit:', error);
      return false;
    }
  }

  /**
   * Get current daily P&L
   */
  static async getDailyPnL() {
    try {
      const result = await db.query(`
        SELECT 
          SUM(pnl) as total_pnl,
          COUNT(*) as trade_count,
          COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades
        FROM trades
        WHERE DATE(created_at) = CURRENT_DATE
        AND status = 'CLOSED'
      `);

      return {
        totalPnL: result.rows[0]?.total_pnl || 0,
        tradeCount: result.rows[0]?.trade_count || 0,
        winningTrades: result.rows[0]?.winning_trades || 0
      };
    } catch (error) {
      console.error('Error getting daily P&L:', error);
      return { totalPnL: 0, tradeCount: 0, winningTrades: 0 };
    }
  }

  /**
   * Get trading statistics
   */
  static async getStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_trades,
          COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades,
          COUNT(CASE WHEN pnl < 0 THEN 1 END) as losing_trades,
          ROUND(COUNT(CASE WHEN pnl > 0 THEN 1 END)::numeric / COUNT(*) * 100, 2) as win_rate,
          ROUND(SUM(pnl), 2) as total_pnl,
          ROUND(AVG(pnl), 2) as avg_pnl,
          ROUND(MAX(pnl), 2) as max_win,
          ROUND(MIN(pnl), 2) as max_loss,
          ROUND(AVG(confidence), 0) as avg_confidence
        FROM trades
        WHERE status = 'CLOSED'
      `);

      return result.rows[0] || {};
    } catch (error) {
      console.error('Error getting stats:', error);
      return {};
    }
  }

  /**
   * Validate trade risk
   */
  static async validateTradeRisk(tradeData) {
    const errors = [];

    // Check daily loss limit
    if (await this.isDailyLossLimitExceeded()) {
      errors.push('Daily loss limit exceeded');
    }

    // Check position size
    const maxPositionSize = this.positionSize(
      parseFloat(process.env.ACCOUNT_BALANCE || 1000)
    );
    if (tradeData.amount > maxPositionSize) {
      errors.push(`Position size ${tradeData.amount} exceeds max ${maxPositionSize}`);
    }

    // Check minimum confidence (unless overridden)
    if (!tradeData.bypassConfidenceCheck) {
      const minConfidence = parseInt(process.env.MIN_CONFIDENCE || 70);
      if (tradeData.confidence < minConfidence) {
        errors.push(`Confidence ${tradeData.confidence}% below minimum ${minConfidence}%`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Calculate optimal stop loss and take profit
   */
  static calculateLevels(entryPrice, direction, confidence) {
    const atrMultiplier = 2; // ATR multiplier for stop loss
    const riskRewardRatio = 1.5;

    // Simple calculation based on 2% ATR estimate
    const atr = entryPrice * 0.02;
    
    if (direction === 'BUY') {
      const stopLoss = (entryPrice - atr * atrMultiplier).toFixed(8);
      const takeProfit = (entryPrice + atr * atrMultiplier * riskRewardRatio).toFixed(8);
      return { stopLoss, takeProfit };
    } else {
      const stopLoss = (entryPrice + atr * atrMultiplier).toFixed(8);
      const takeProfit = (entryPrice - atr * atrMultiplier * riskRewardRatio).toFixed(8);
      return { stopLoss, takeProfit };
    }
  }
}

module.exports = RiskManager;
