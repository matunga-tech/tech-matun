-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  entry_price NUMERIC(12, 8),
  amount NUMERIC(12, 2),
  confidence INT CHECK (confidence >= 0 AND confidence <= 100),
  pnl NUMERIC(12, 2),
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
  strategy_signal VARCHAR(20),
  ai_recommendation TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  notes TEXT
);

-- Create signals table for historical analysis
CREATE TABLE IF NOT EXISTS signals (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  adx NUMERIC(5, 2),
  rsi NUMERIC(5, 2),
  price NUMERIC(12, 8),
  signal VARCHAR(20) CHECK (signal IN ('BUY', 'SELL', 'HOLD')),
  confidence INT,
  ai_enhanced BOOLEAN DEFAULT FALSE,
  ai_confidence INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  trade_id INT REFERENCES trades(id) ON DELETE SET NULL,
  type VARCHAR(50) CHECK (type IN ('SIGNAL', 'TRADE_OPEN', 'TRADE_CLOSE', 'RISK_WARNING', 'AI_ALERT')),
  message TEXT NOT NULL,
  recipient VARCHAR(100),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP
);

-- Create performance metrics table
CREATE TABLE IF NOT EXISTS metrics (
  id SERIAL PRIMARY KEY,
  total_trades INT,
  winning_trades INT,
  losing_trades INT,
  win_rate NUMERIC(5, 2),
  total_pnl NUMERIC(12, 2),
  avg_win NUMERIC(12, 2),
  avg_loss NUMERIC(12, 2),
  max_drawdown NUMERIC(5, 2),
  calculated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_created_at ON trades(created_at);
CREATE INDEX idx_signals_symbol ON signals(symbol);
CREATE INDEX idx_signals_created_at ON signals(created_at);
CREATE INDEX idx_notifications_trade_id ON notifications(trade_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- Create views for analysis
CREATE OR REPLACE VIEW trade_summary AS
SELECT 
  symbol,
  COUNT(*) as total_trades,
  COUNT(CASE WHEN direction = 'BUY' THEN 1 END) as buy_count,
  COUNT(CASE WHEN direction = 'SELL' THEN 1 END) as sell_count,
  COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades,
  COUNT(CASE WHEN pnl < 0 THEN 1 END) as losing_trades,
  ROUND(COUNT(CASE WHEN pnl > 0 THEN 1 END)::numeric / COUNT(*) * 100, 2) as win_rate,
  ROUND(SUM(pnl), 2) as total_pnl,
  ROUND(AVG(CASE WHEN pnl > 0 THEN pnl END), 2) as avg_win,
  ROUND(AVG(CASE WHEN pnl < 0 THEN pnl END), 2) as avg_loss,
  MAX(confidence) as max_confidence,
  AVG(confidence) as avg_confidence
FROM trades
WHERE status = 'CLOSED'
GROUP BY symbol;

CREATE OR REPLACE VIEW daily_performance AS
SELECT 
  DATE(created_at) as trade_date,
  COUNT(*) as trades_count,
  ROUND(SUM(pnl), 2) as daily_pnl,
  COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades,
  ROUND(AVG(confidence), 0) as avg_confidence
FROM trades
WHERE status = 'CLOSED'
GROUP BY DATE(created_at)
ORDER BY trade_date DESC;
