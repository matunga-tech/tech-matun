# Deriv AI Bot V2

A production-ready AI-powered trading bot for Deriv with strategy engine, risk management, and intelligent decision-making.

## Features

- **Strategy Engine**: ADX + RSI signals with AI enhancement via Claude/OpenAI
- **Risk Manager**: Position sizing based on account balance
- **Trade Journal**: Track all trades with detailed logs
- **PostgreSQL Integration**: Persistent trade storage
- **AI Gateway**: Claude/OpenAI integration for smarter signals
- **Notifications**: Email/Slack alerts for trade events
- **RESTful API**: Scan market and execute trades

## Tech Stack

- **Node.js + Express**: Backend API
- **PostgreSQL**: Trade database
- **Claude/OpenAI**: AI decision engine
- **WebSocket**: Real-time market data (ready)
- **Nodemailer/Slack SDK**: Notifications

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create `.env` file:
```
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/deriv_bot
CLAUDE_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key
SLACK_WEBHOOK_URL=your_slack_webhook
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
DERIV_API_URL=wss://ws.derivws.com/websockets/v3
```

### 3. Database Setup
```bash
psql -U postgres -d deriv_bot -f schema.sql
```

### 4. Start Bot
```bash
npm start
```

## API Endpoints

### POST /api/scan
Scan market and get trade signal
```json
{
  "symbol": "EURUSD",
  "adx": 35,
  "rsi": 28,
  "price": 1.0850
}
```

### POST /api/trade
Execute trade
```json
{
  "symbol": "EURUSD",
  "direction": "BUY",
  "amount": 100,
  "confidence": 85
}
```

### GET /api/journal
Get trade history

## Architecture

```
├── server.js                 # Main entry point
├── routes/
│   ├── scan.js              # Market scan route
│   └── trade.js             # Trade execution route
├── services/
│   ├── strategyEngine.js    # ADX/RSI + AI signals
│   ├── aiGateway.js         # Claude/OpenAI integration
│   ├── riskManager.js       # Position sizing
│   ├── journalService.js    # Trade logging
│   ├── notificationService.js # Email/Slack alerts
│   └── derivClient.js       # Deriv API client
├── db/
│   └── schema.sql           # PostgreSQL schema
├── config/
│   └── database.js          # DB connection pool
└── .env                      # Environment variables
```

## Usage Flow

1. **Scan**: API receives market data (ADX, RSI, price)
2. **Strategy**: strategyEngine evaluates signals
3. **AI Enhancement**: Claude/OpenAI reviews recommendation
4. **Risk Check**: riskManager calculates position size
5. **Notify**: Send notification of signal
6. **Execute**: If approved, execute trade on Deriv
7. **Log**: Record trade in PostgreSQL + journal

## Contributing

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Submit PR

## License

MIT
