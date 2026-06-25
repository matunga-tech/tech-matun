const aiGateway = require('./aiGateway');

/**
 * Core strategy engine with ADX + RSI signals
 * Enhanced with AI for smarter recommendations
 */

async function evaluate(marketData) {
  try {
    const { adx = 0, rsi = 50, price = 0, symbol = 'UNKNOWN' } = marketData;

    // Traditional signal based on ADX + RSI
    const baseSignal = generateBaseSignal(adx, rsi);
    let confidence = calculateConfidence(adx, rsi);

    // AI enhancement if enabled
    let aiRecommendation = null;
    let aiConfidence = null;

    if (process.env.USE_AI_ENHANCEMENT === 'true') {
      const aiResult = await aiGateway.enhanceSignal({
        symbol,
        baseSignal,
        adx,
        rsi,
        price,
        confidence
      });

      aiRecommendation = aiResult.recommendation;
      aiConfidence = aiResult.confidence;

      // If AI confidence is high, use AI signal; otherwise use base signal
      if (aiConfidence >= parseInt(process.env.MIN_CONFIDENCE || 70)) {
        confidence = aiConfidence;
      }
    }

    return {
      signal: baseSignal,
      confidence: Math.min(99, confidence),
      adx: Math.round(adx * 100) / 100,
      rsi: Math.round(rsi * 100) / 100,
      price: price,
      aiEnhanced: !!aiRecommendation,
      aiRecommendation,
      aiConfidence,
      timestamp: new Date().toISOString(),
      strength: getSignalStrength(adx, rsi),
      recommendation: confidence >= parseInt(process.env.MIN_CONFIDENCE || 70) 
        ? `${baseSignal} with ${confidence}% confidence` 
        : 'HOLD - Low confidence'
    };
  } catch (error) {
    console.error('Strategy evaluation error:', error);
    return {
      signal: 'HOLD',
      confidence: 0,
      error: error.message,
      aiEnhanced: false
    };
  }
}

function generateBaseSignal(adx, rsi) {
  const adxThreshold = parseFloat(process.env.ADX_THRESHOLD || 25);
  const rsiBuyLevel = parseFloat(process.env.RSI_BUY_LEVEL || 35);
  const rsiSellLevel = parseFloat(process.env.RSI_SELL_LEVEL || 65);

  // ADX < threshold means weak trend, no signal
  if (adx < adxThreshold) {
    return 'HOLD';
  }

  // ADX high + RSI low = strong uptrend + oversold = BUY
  if (adx >= adxThreshold && rsi < rsiBuyLevel) {
    return 'BUY';
  }

  // ADX high + RSI high = strong downtrend + overbought = SELL
  if (adx >= adxThreshold && rsi > rsiSellLevel) {
    return 'SELL';
  }

  return 'HOLD';
}

function calculateConfidence(adx, rsi) {
  const adxThreshold = parseFloat(process.env.ADX_THRESHOLD || 25);
  const rsiBuyLevel = parseFloat(process.env.RSI_BUY_LEVEL || 35);
  const rsiSellLevel = parseFloat(process.env.RSI_SELL_LEVEL || 65);

  let confidence = 50; // Base confidence

  // ADX strength (0-25)
  const adxStrength = Math.min(25, (adx / 50) * 25);
  confidence += adxStrength;

  // RSI extremeness (0-25)
  if (rsi < rsiBuyLevel) {
    const rsiStrength = Math.min(25, ((rsiBuyLevel - rsi) / rsiBuyLevel) * 25);
    confidence += rsiStrength;
  } else if (rsi > rsiSellLevel) {
    const rsiStrength = Math.min(25, ((rsi - rsiSellLevel) / (100 - rsiSellLevel)) * 25);
    confidence += rsiStrength;
  }

  return Math.round(Math.min(100, confidence));
}

function getSignalStrength(adx, rsi) {
  if (adx < 20) return 'WEAK';
  if (adx < 35) return 'MODERATE';
  if (adx < 50) return 'STRONG';
  return 'VERY_STRONG';
}

/**
 * Batch evaluate multiple symbols
 */
async function batchEvaluate(marketDataArray) {
  return Promise.all(
    marketDataArray.map(data => evaluate(data))
  );
}

module.exports = {
  evaluate,
  batchEvaluate,
  generateBaseSignal,
  calculateConfidence,
  getSignalStrength
};
