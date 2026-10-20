const rateLimit = require('express-rate-limit');

/**
 * Global API rate limiter middleware
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

/**
 * Rate limiter for authentication routes
 */
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500,
  message: {
    status: 429,
    message: 'Too many authentication attempts from this IP, please try again later.'
  }
});

/**
 * Strict rate limiter for food post creation
 */
const foodPostLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Maximum 30 food posts per hour per IP
  message: {
    status: 429,
    message: 'Too many food posts from this IP, please try again later.'
  }
});

const assistantLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many assistant questions. Please try again in a few minutes.'
  }
});

/**
 * Limiter for wallet operations that create or move money
 */
const walletLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many wallet requests. Please wait a few minutes and try again.'
  }
});

module.exports = {
  apiLimiter,
  walletLimiter,
  authLimiter,
  signupLimiter: authLimiter,
  loginLimiter: authLimiter,
  foodPostLimiter,
  assistantLimiter
};
