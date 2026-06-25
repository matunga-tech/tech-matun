# Deployment Guide - Deriv AI Bot V2

## Local Development Setup

### 1. Clone and Install
```bash
git clone <repo-url>
cd tech-matun
npm install
```

### 2. PostgreSQL Setup

#### Install PostgreSQL
- **macOS**: `brew install postgresql@15`
- **Ubuntu**: `sudo apt-get install postgresql postgresql-contrib`
- **Windows**: Download from https://www.postgresql.org/download/windows/

#### Create Database
```bash
psql -U postgres

# In psql shell
CREATE DATABASE deriv_bot;
\c deriv_bot
\i schema.sql
\q
```

### 3. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` with your values:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/deriv_bot
CLAUDE_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 4. Get API Keys

**Claude API Key**
1. Visit https://console.anthropic.com
2. Create account and get API key
3. Add to `.env`

**OpenAI API Key**
1. Visit https://platform.openai.com/api-keys
2. Create new API key
3. Add to `.env`

**Slack Webhook**
1. Create Slack App: https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Create new webhook for your channel
4. Copy webhook URL to `.env`

**Gmail SMTP**
1. Enable 2FA on Gmail
2. Create App Password: https://myaccount.google.com/apppasswords
3. Use email and app password in `.env`

### 5. Start Development Server
```bash
npm run dev
```

Server runs on http://localhost:3000

## Production Deployment

### Option 1: Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t deriv-bot .
docker run -p 3000:3000 --env-file .env deriv-bot
```

### Option 2: Railway.app (Recommended for Beginners)

1. Push code to GitHub
2. Go to https://railway.app
3. Create new project from GitHub repo
4. Add PostgreSQL plugin
5. Set environment variables
6. Deploy!

### Option 3: Heroku (Alternative)

```bash
heroku create deriv-ai-bot
heroku addons:create heroku-postgresql:standard-0
heroku config:set CLAUDE_API_KEY=sk-ant-xxxxx
git push heroku main
```

### Option 4: AWS/DigitalOcean VPS

**On VPS:**
```bash
# Update system
sudo apt update && sudo apt upgrade

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Clone and setup
git clone <repo-url>
cd tech-matun
npm install

# Create .env file with production keys
nano .env

# Start with PM2
npm install -g pm2
pm2 start server.js --name "deriv-bot"
pm2 startup
pm2 save

# Setup Nginx reverse proxy
sudo apt install nginx
# Configure nginx to proxy to localhost:3000
# Enable SSL with Let's Encrypt
```

## Testing the Bot

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. Test Scan Endpoint
```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "EURUSD",
    "adx": 35,
    "rsi": 28,
    "price": 1.0850
  }'
```

### 3. Execute Test Trade
```bash
curl -X POST http://localhost:3000/api/trade \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "EURUSD",
    "direction": "BUY",
    "amount": 100,
    "confidence": 85,
    "entryPrice": 1.0850
  }'
```

### 4. Close Trade
```bash
curl -X POST http://localhost:3000/api/trade/1/close \
  -H "Content-Type: application/json" \
  -d '{
    "exitPrice": 1.0900,
    "notes": "Profit target hit"
  }'
```

### 5. Get Journal
```bash
curl http://localhost:3000/api/journal/summary
```

## Monitoring & Logs

### View Logs (Local)
```bash
npm run dev
```

### View Logs (Production with PM2)
```bash
pm2 logs deriv-bot
```

### Database Queries
```bash
psql -U postgres -d deriv_bot

# View trades
SELECT * FROM trades ORDER BY created_at DESC LIMIT 10;

# View signals
SELECT * FROM signals ORDER BY created_at DESC LIMIT 10;

# View statistics
SELECT * FROM trade_summary;
```

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
Solution: Make sure PostgreSQL is running
```bash
# macOS
brew services start postgresql@15

# Ubuntu
sudo systemctl start postgresql

# Windows
# Start PostgreSQL from Services
```

### API Key Not Recognized
- Verify `.env` file syntax
- Check API keys are valid
- Restart server after changing `.env`

### Notifications Not Sending
- Check SMTP credentials
- Verify Slack webhook URL
- Check server logs for errors

### High Database CPU Usage
- Run `VACUUM ANALYZE;` in PostgreSQL
- Add more indexes if needed
- Archive old trades to separate table

## Scaling Recommendations

1. **High-Frequency Trading**: Use Redis for caching signals
2. **Multiple Symbols**: Implement batch processing
3. **Heavy Load**: Use connection pooling (already in code)
4. **Real-time Data**: Use WebSocket connection to market data
5. **Data Archive**: Move old trades to separate schema

## Maintenance

### Daily
- Monitor P&L
- Check for errors in logs

### Weekly
- Analyze performance metrics
- Review risk management settings

### Monthly
- Archive closed trades
- Update AI models
- Review and optimize strategy parameters

## Support

- Issues: https://github.com/matunga-tech/tech-matun/issues
- Email: matunga-tech@github.com
