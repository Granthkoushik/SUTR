import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { BusinessDatabaseManager } from './businessDatabase';

export interface BusinessTokenPayload {
  jti: string;
  userId: string;
  phone: string;
  businessId: string;
  businessServerUrl: string;
  iat: number;
  exp: number;
}

export interface BusinessAuthenticatedRequest extends Request {
  user?: BusinessTokenPayload;
  dbManager?: BusinessDatabaseManager;
}

export function createBusinessAuthMiddleware(
  configuredBusinessId: string,
  tokenSecret?: string
) {
  const secret = tokenSecret || process.env.CENTRAL_AUTH_SECRET || 'leadflow_distributed_secure_secret_2026';

  return (req: BusinessAuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: Missing or invalid Authorization Bearer header',
      });
    }

    const token = authHeader.substring(7).trim();
    if (!token || !token.includes('.')) {
      return res.status(401).json({ error: 'Unauthorized: Malformed token format' });
    }

    try {
      const [payloadBase64, providedSignature] = token.split('.');
      if (!payloadBase64 || !providedSignature) {
        return res.status(401).json({ error: 'Unauthorized: Incomplete token' });
      }

      // Verify cryptographic signature
      const expectedSignature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');
      if (!crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
        return res.status(401).json({ error: 'Unauthorized: Cryptographic token signature verification failed' });
      }

      const payload: BusinessTokenPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));

      // Verify expiration
      if (Date.now() > payload.exp) {
        return res.status(401).json({ error: 'Unauthorized: Session token expired' });
      }

      // Strict Business Identity Authorization Enforcement:
      // Prevent cross-business access even with a valid signed token from central auth
      if (payload.businessId !== configuredBusinessId) {
        return res.status(403).json({
          error: `Forbidden: Access Denied. Token is issued for business '${payload.businessId}', but this server exclusively hosts '${configuredBusinessId}'. Cross-tenant access is strictly blocked.`,
        });
      }

      req.user = payload;
      next();
    } catch (err: any) {
      return res.status(401).json({ error: `Unauthorized: ${err.message || 'Invalid session'}` });
    }
  };
}
