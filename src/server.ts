import express from 'express';
import { apiLimiter, aiLimiter, authLimiter } from './config/rateLimit';

const app = express();

// Terapkan rate limit global
app.use(apiLimiter);

// Rate limit khusus untuk endpoint AI/chat
app.use('/v1/playground/agents', aiLimiter);
app.use('/flowise', aiLimiter);

// Rate limit untuk auth
app.use('/auth', authLimiter); 