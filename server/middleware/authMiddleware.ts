import { Request, Response, NextFunction } from 'express';
import { CentralAuthService } from '../auth/centralAuthService';
import { BusinessDataService } from '../business/businessDataService';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    businessId: string;
    phone: string;
  };
  businessService?: BusinessDataService;
}

export function createAuthMiddleware(centralAuth: CentralAuthService) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7);
    const verified = centralAuth.verifyToken(token);

    if (!verified) {
      return res.status(401).json({ error: 'Session expired or invalid token' });
    }

    req.user = verified;
    req.businessService = new BusinessDataService(verified.businessId);

    // Authorization verification: if route specifies a businessId param, ensure user owns this business
    if (req.params.businessId && req.params.businessId !== verified.businessId) {
      return res.status(403).json({ error: 'Access denied: Cannot access data belonging to another business' });
    }

    next();
  };
}
