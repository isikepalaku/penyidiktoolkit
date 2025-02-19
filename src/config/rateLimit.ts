import { rateLimit } from 'express-rate-limit';

// Rate limit untuk API umum
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 100, // Limit setiap IP ke 100 request per window
  standardHeaders: 'draft-8', // `RateLimit` header
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    status: 429,
    message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi setelah 15 menit'
  }
});

// Rate limit khusus untuk endpoint chat/AI
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  limit: 10, // Limit setiap IP ke 10 request per menit
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Terlalu banyak permintaan chat, silakan tunggu beberapa saat'
  }
});

// Rate limit untuk endpoint autentikasi
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  limit: 5, // Limit 5 percobaan per jam
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Terlalu banyak percobaan, silakan coba lagi dalam 1 jam'
  }
}); 