const nodemailer = require('nodemailer');
const { IncomingWebhook } = require('@slack/webhook');
const db = require('../config/database');

/**
 * Notification Service - Email and Slack alerts
 */

class NotificationService {
  static initializeEmailTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  static initializeSlackWebhook() {
    if (!process.env.SLACK_WEBHOOK_URL) {
      return null;
    }
    return new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
  }

  /**
   * Send email notification
   */
  static async sendEmail(subject, message, htmlContent = null) {
    try {
      if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.warn('Email not configured');
        return false;
      }

      const transporter = this.initializeEmailTransporter();

      const mailOptions = {
        from: process.env.SMTP_EMAIL,
        to: process.env.NOTIFICATION_EMAIL || process.env.SMTP_EMAIL,
        subject: `[Deriv Bot] ${subject}`,
        text: message,
        html: htmlContent || `<p>${message}</p>`
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Send Slack notification
   */
  static async sendSlackMessage(title, message, details = {}) {
    try {
      const webhook = this.initializeSlackWebhook();
      if (!webhook) {
        console.warn('Slack webhook not configured');
        return false;
      }

      const payload = {
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🤖 ${title}`,
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message
            }
          }
        ]
      };

      if (Object.keys(details).length > 0) {
        const fields = Object.entries(details).map(([key, value]) => ({
          type: 'mrkdwn',
          text: `*${key}:* ${value}`
        }));

        payload.blocks.push({
          type: 'section',
          fields
        });
      }

      await webhook.send(payload);
      console.log('Slack message sent');
      return true;
    } catch (error) {
      console.error('Error sending Slack message:', error);
      return false;
    }
  }

  /**
   * Notify on new signal
   */
  static async notifySignal(signalData) {
    try {
      const { symbol, signal, confidence, adx, rsi, price } = signalData;

      const title = `${signal} Signal - ${symbol}`;
      const message = `
        *Signal:* ${signal}
        *Confidence:* ${confidence}%
        *ADX:* ${adx.toFixed(2)}
        *RSI:* ${rsi.toFixed(2)}
        *Price:* ${price}
      `;

      // Send both email and Slack
      await this.sendEmail(
        title,
        `${title}\nConfidence: ${confidence}%\nADX: ${adx}\nRSI: ${rsi}\nPrice: ${price}`
      );

      await this.sendSlackMessage(title, message, {
        'Confidence': `${confidence}%`,
        'ADX': adx.toFixed(2),
        'RSI': rsi.toFixed(2),
        'Price': price
      });

      // Store in database
      await db.query(
        `INSERT INTO notifications (type, message) VALUES ($1, $2)`,
        ['SIGNAL', `${signal} signal for ${symbol} with ${confidence}% confidence`]
      );

      return true;
    } catch (error) {
      console.error('Error notifying signal:', error);
      return false;
    }
  }

  /**
   * Notify on trade opened
   */
  static async notifyTradeOpen(tradeData) {
    try {
      const { id, symbol, direction, entryPrice, amount, confidence } = tradeData;

      const title = `Trade Opened - ${direction} ${symbol}`;
      const message = `
        *Direction:* ${direction}
        *Symbol:* ${symbol}
        *Entry Price:* ${entryPrice}
        *Amount:* ${amount}
        *Confidence:* ${confidence}%
      `;

      await this.sendEmail(title, message);
      await this.sendSlackMessage(title, message, {
        'Direction': direction,
        'Symbol': symbol,
        'Entry Price': entryPrice,
        'Amount': amount,
        'Confidence': `${confidence}%`
      });

      await db.query(
        `INSERT INTO notifications (trade_id, type, message) VALUES ($1, $2, $3)`,
        [id, 'TRADE_OPEN', `${direction} trade opened for ${symbol} at ${entryPrice}`]
      );

      return true;
    } catch (error) {
      console.error('Error notifying trade open:', error);
      return false;
    }
  }

  /**
   * Notify on trade closed
   */
  static async notifyTradeClosed(tradeData) {
    try {
      const { id, symbol, direction, pnl, status } = tradeData;

      const title = `Trade Closed - ${direction} ${symbol} ${pnl > 0 ? '✅ WIN' : '❌ LOSS'}`;
      const message = `
        *Trade ID:* ${id}
        *Symbol:* ${symbol}
        *Direction:* ${direction}
        *P&L:* ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}
        *Status:* ${status}
      `;

      await this.sendEmail(title, message);
      await this.sendSlackMessage(title, message, {
        'Symbol': symbol,
        'P&L': `${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}`,
        'Status': status
      });

      await db.query(
        `INSERT INTO notifications (trade_id, type, message) VALUES ($1, $2, $3)`,
        [id, 'TRADE_CLOSE', `${direction} trade closed for ${symbol} with P&L: ${pnl.toFixed(2)}`]
      );

      return true;
    } catch (error) {
      console.error('Error notifying trade closed:', error);
      return false;
    }
  }

  /**
   * Notify risk warning
   */
  static async notifyRiskWarning(warning) {
    try {
      const title = '⚠️ Risk Warning';
      const message = `*Warning:* ${warning}`;

      await this.sendEmail(title, warning);
      await this.sendSlackMessage(title, message);

      await db.query(
        `INSERT INTO notifications (type, message) VALUES ($1, $2)`,
        ['RISK_WARNING', warning]
      );

      return true;
    } catch (error) {
      console.error('Error notifying risk warning:', error);
      return false;
    }
  }

  /**
   * Get notification history
   */
  static async getHistory(limit = 50) {
    try {
      const result = await db.query(
        `SELECT * FROM notifications 
         ORDER BY created_at DESC 
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }
}

module.exports = NotificationService;
