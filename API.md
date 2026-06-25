# Deriv AI Bot V2 - API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
Currently no authentication required. Add JWT or API keys in production.

---

## Health Check

### GET /health
Check if the bot is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-25T06:46:20Z"
}
```

---

## Scan Endpoints

### POST /api/scan
Analyze market data and get trading signal.

**Request:**
```json
{
  "symbol": "EURUSD",
  "adx": 35,
  "rsi": 28,
  "price": 1.0850
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signal": "BUY",
    "confidence": 85,
    "adx": 35.00,
    "rsi": 28.00,
    "price": 1.0850,
    "aiEnhanced": true,
    "aiRecommendation": "BUY",
    "aiConfidence": 87,
    "timestamp": "2026-06-25T06:46:20Z",
    "strength": "STRONG",
    "recommendation": "BUY with 85% confidence"
  },
  "timestamp": "2026-06-25T06:46:20Z"
}
```

**Signal Levels:**
- `BUY`: ADX > threshold AND RSI < RSI_BUY_LEVEL
- `SELL`: ADX > threshold AND RSI > RSI_SELL_LEVEL
- `HOLD`: Trend too weak or neutral indicators

**Confidence Calculation:**
- Base: 50%
- ADX strength: +0-25% (based on trend strength)
- RSI extremeness: +0-25% (based on overbought/oversold)

---

### GET /api/scan/history
Get signal history.

**Query Parameters:**
- `symbol` (optional): Filter by symbol
- `limit` (optional, default: 50): Number of records

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "symbol": "EURUSD",
      "adx": 35.0,
      "rsi": 28.0,
      "price": 1.0850,
      "signal": "BUY",
      "confidence": 85,
      "ai_enhanced": true,
      "ai_confidence": 87,
      "created_at": "2026-06-25T06:46:20Z"
    }
  ],
  "count": 1
}
```

---

### GET /api/scan/analysis
Get AI-powered market analysis.

**Query Parameters:**
- `symbols` (default: "EURUSD,GBPUSD"): Comma-separated symbols
- `timeframe` (default: "1h"): H1, H4, D1, etc.

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": "EUR/USD showing strong uptrend with ADX > 30. RSI is oversold at 28, suggesting potential bounce or continuation. Risk: strong momentum may lead to false breakouts.",
    "isAvailable": true,
    "provider": "claude"
  },
  "timestamp": "2026-06-25T06:46:20Z"
}
```

---

## Trade Endpoints

### POST /api/trade
Execute a new trade.

**Request:**
```json
{
  "symbol": "EURUSD",
  "direction": "BUY",
  "amount": 100,
  "confidence": 85,
  "strategySignal": "BUY",
  "entryPrice": 1.0850,
  "aiRecommendation": "BUY"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trade opened successfully",
  "data": {
    "id": 1,
    "symbol": "EURUSD",
    "direction": "BUY",
    "entry_price": 1.0850,
    "amount": 100,
    "confidence": 85,
    "status": "OPEN",
    "stopLoss": "1.0833",
    "takeProfit": "1.0881",
    "created_at": "2026-06-25T06:46:20Z"
  },
  "timestamp": "2026-06-25T06:46:20Z"
}
```

**Validation:**
- Risk limits checked before execution
- Daily loss limit enforced
- Position size validated
- Confidence threshold verified

---

### POST /api/trade/:tradeId/close
Close an open trade.

**Request:**
```json
{
  "exitPrice": 1.0900,
  "notes": "Profit target reached"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trade closed successfully",
  "data": {
    "id": 1,
    "symbol": "EURUSD",
    "direction": "BUY",
    "entry_price": 1.0850,
    "pnl": 50.00,
    "status": "CLOSED",
    "closed_at": "2026-06-25T06:50:20Z"
  },
  "timestamp": "2026-06-25T06:50:20Z"
}
```

---

### GET /api/trade/:tradeId
Get trade details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "symbol": "EURUSD",
    "direction": "BUY",
    "entry_price": 1.0850,
    "amount": 100,
    "confidence": 85,
    "pnl": 50.00,
    "status": "CLOSED",
    "created_at": "2026-06-25T06:46:20Z",
    "closed_at": "2026-06-25T06:50:20Z"
  }
}
```

---

### GET /api/trade
List trades with filters.

**Query Parameters:**
- `symbol` (optional): Filter by symbol
- `status` (optional): OPEN, CLOSED, CANCELLED
- `limit` (optional, default: 50): Number of records
- `startDate` (optional): ISO date
- `endDate` (optional): ISO date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "symbol": "EURUSD",
      "direction": "BUY",
      "entry_price": 1.0850,
      "amount": 100,
      "confidence": 85,
      "pnl": 50.00,
      "status": "CLOSED"
    }
  ],
  "count": 1
}
```

---

### GET /api/trade/stats/overview
Get trading statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_trades": 50,
    "winning_trades": 35,
    "losing_trades": 15,
    "win_rate": 70.00,
    "total_pnl": 1250.50,
    "avg_pnl": 25.01,
    "best_trade": 150.00,
    "worst_trade": -75.00,
    "avg_confidence": 82,
    "dailyPnL": {
      "totalPnL": 250.00,
      "tradeCount": 5,
      "winningTrades": 4
    }
  }
}
```

---

## Journal Endpoints

### GET /api/journal
Get trade history.

**Query Parameters:**
- `symbol` (optional): Filter by symbol
- `status` (optional): OPEN, CLOSED, CANCELLED
- `limit` (optional, default: 50): Number of records
- `startDate` (optional): ISO date
- `endDate` (optional): ISO date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "symbol": "EURUSD",
      "direction": "BUY",
      "entry_price": 1.0850,
      "pnl": 50.00,
      "status": "CLOSED",
      "created_at": "2026-06-25T06:46:20Z"
    }
  ],
  "count": 1,
  "timestamp": "2026-06-25T06:46:20Z"
}
```

---

### GET /api/journal/today
Get today's trades.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "symbol": "EURUSD",
      "direction": "BUY",
      "pnl": 50.00,
      "status": "CLOSED"
    }
  ],
  "count": 1,
  "date": "2026-06-25"
}
```

---

### GET /api/journal/summary
Get trading summary statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_trades": 50,
    "winning_trades": 35,
    "losing_trades": 15,
    "win_rate": 70.00,
    "total_pnl": 1250.50,
    "avg_pnl": 25.01,
    "best_trade": 150.00,
    "worst_trade": -75.00,
    "avg_confidence": 82
  },
  "timestamp": "2026-06-25T06:46:20Z"
}
```

---

### GET /api/journal/:id
Get specific trade details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "symbol": "EURUSD",
    "direction": "BUY",
    "entry_price": 1.0850,
    "amount": 100,
    "confidence": 85,
    "pnl": 50.00,
    "status": "CLOSED",
    "strategy_signal": "BUY",
    "ai_recommendation": "BUY",
    "created_at": "2026-06-25T06:46:20Z",
    "closed_at": "2026-06-25T06:50:20Z"
  }
}
```

---

### GET /api/journal/signals/history
Get signal history.

**Query Parameters:**
- `symbol` (optional): Filter by symbol
- `limit` (optional, default: 50): Number of records

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "symbol": "EURUSD",
      "adx": 35.0,
      "rsi": 28.0,
      "price": 1.0850,
      "signal": "BUY",
      "confidence": 85,
      "ai_enhanced": true,
      "ai_confidence": 87,
      "created_at": "2026-06-25T06:46:20Z"
    }
  ],
  "count": 1
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "timestamp": "2026-06-25T06:46:20Z"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad request (validation error)
- `404`: Not found
- `500`: Internal server error

**Example Error:**
```json
{
  "error": "Trade validation failed",
  "errors": [
    "Daily loss limit exceeded",
    "Position size 500 exceeds max 100"
  ],
  "success": false
}
```

---

## Environment Variables

```
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@host:5432/deriv_bot

# AI
CLAUDE_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
AI_PROVIDER=claude

# Strategy
ADX_THRESHOLD=25
RSI_BUY_LEVEL=35
RSI_SELL_LEVEL=65
MIN_CONFIDENCE=70
USE_AI_ENHANCEMENT=true

# Trading
ACCOUNT_BALANCE=1000
RISK_PER_TRADE=0.01
MAX_DAILY_LOSS=0.05

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
SMTP_EMAIL=email@gmail.com
SMTP_PASSWORD=app_password
NOTIFICATION_EMAIL=recipient@example.com
```

---

## Example Workflow

### 1. Scan Market
```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"symbol":"EURUSD","adx":35,"rsi":28,"price":1.0850}'
```

### 2. Receive BUY Signal
Bot returns signal with 85% confidence

### 3. Execute Trade
```bash
curl -X POST http://localhost:3000/api/trade \
  -H "Content-Type: application/json" \
  -d '{
    "symbol":"EURUSD",
    "direction":"BUY",
    "amount":100,
    "confidence":85,
    "entryPrice":1.0850
  }'
```

### 4. Monitor Trade
```bash
curl http://localhost:3000/api/trade/1
```

### 5. Close Trade
```bash
curl -X POST http://localhost:3000/api/trade/1/close \
  -H "Content-Type: application/json" \
  -d '{"exitPrice":1.0900,"notes":"Profit target"}'
```

### 6. Review Performance
```bash
curl http://localhost:3000/api/journal/summary
```

---

## Rate Limiting
Currently not implemented. Add in production using express-rate-limit.

## WebSocket Support
Planned for real-time market data streaming.

## Changelog
- v2.0.0: Initial release with AI enhancement, risk management, and notifications
