const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

const provider = process.env.AI_PROVIDER || 'claude';
let client;

// Initialize AI client based on provider
if (provider === 'claude') {
  client = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
  });
} else if (provider === 'openai') {
  client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

/**
 * Enhance trading signal with AI analysis
 */
async function enhanceSignal(signalData) {
  try {
    if (!client) {
      console.warn('AI provider not configured');
      return { recommendation: null, confidence: 0 };
    }

    const { baseSignal, adx, rsi, price, symbol, confidence } = signalData;

    const prompt = `You are a professional trading analyst. Analyze this market signal and provide your recommendation.

Symbol: ${symbol}
Base Signal: ${baseSignal}
ADX (Trend Strength): ${adx}
RSI (Momentum): ${rsi}
Current Price: ${price}
Base Confidence: ${confidence}%

Current Market Context:
- ADX > 25 indicates a strong trend
- RSI < 30 indicates oversold (potential buy)
- RSI > 70 indicates overbought (potential sell)
- Price ${price} is the current level

Based on this technical analysis, provide:
1. Your trading recommendation (BUY, SELL, or HOLD)
2. Confidence level (0-100)
3. Brief reasoning (1-2 sentences)

Respond in JSON format:
{
  "recommendation": "BUY|SELL|HOLD",
  "confidence": 0-100,
  "reasoning": "Brief explanation"
}`;

    let response;

    if (provider === 'claude') {
      response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0].text;
      return parseAIResponse(content);
    } else if (provider === 'openai') {
      response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.choices[0].message.content;
      return parseAIResponse(content);
    }
  } catch (error) {
    console.error('AI gateway error:', error.message);
    return {
      recommendation: null,
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Parse AI response and extract structured data
 */
function parseAIResponse(response) {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('Could not extract JSON from AI response');
      return { recommendation: null, confidence: 0 };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      recommendation: parsed.recommendation,
      confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 0)),
      reasoning: parsed.reasoning
    };
  } catch (error) {
    console.error('Error parsing AI response:', error.message);
    return { recommendation: null, confidence: 0 };
  }
}

/**
 * Get AI-powered market analysis
 */
async function analyzeMarket(marketData) {
  try {
    if (!client) {
      return { analysis: 'AI provider not configured', isAvailable: false };
    }

    const { symbols, timeframe = '1h' } = marketData;

    const prompt = `You are an expert market analyst. Provide a brief market analysis.

Symbols to analyze: ${symbols.join(', ')}
Timeframe: ${timeframe}

Provide key insights about market conditions and potential trading opportunities.
Keep it concise (3-4 sentences).`;

    let response;

    if (provider === 'claude') {
      response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      });
      return {
        analysis: response.content[0].text,
        isAvailable: true,
        provider: 'claude'
      };
    } else if (provider === 'openai') {
      response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      });
      return {
        analysis: response.choices[0].message.content,
        isAvailable: true,
        provider: 'openai'
      };
    }
  } catch (error) {
    console.error('Market analysis error:', error.message);
    return {
      analysis: error.message,
      isAvailable: false,
      error: error.message
    };
  }
}

module.exports = {
  enhanceSignal,
  analyzeMarket,
  parseAIResponse
};
