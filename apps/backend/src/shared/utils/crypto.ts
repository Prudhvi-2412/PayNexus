import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

export interface TokenPayload {
  userId: string;
  role: string;
  email: string;
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
};

/**
 * Generates an API key
 * Format: sk_live_[32 char random hex]
 * Returns { rawKey, prefix, keyHash }
 */
export const generateApiKey = (): { rawKey: string; prefix: string; keyHash: string } => {
  const randomBytes = crypto.randomBytes(16).toString('hex'); // 32 hex chars
  const rawKey = `sk_live_${randomBytes}`;
  const prefix = `sk_live_${randomBytes.substring(0, 6)}`;
  const keyHash = hashString(rawKey);
  return { rawKey, prefix, keyHash };
};

/**
 * SHA-256 hash helper
 */
export const hashString = (str: string): string => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

/**
 * HMAC signature generator for webhook events
 */
export const generateWebhookSignature = (payload: string, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};
