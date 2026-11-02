import { Router, Request, Response } from 'express';
import { CentralAuthService } from '../auth/centralAuthService';

export function createAuthRouter(centralAuth: CentralAuthService): Router {
  const router = Router();

  // 1. Request WhatsApp OTP
  router.post('/request-otp', async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: 'Mobile number is required' });
      }

      const result = await centralAuth.requestWhatsAppOtp(phone);
      return res.json(result);
    } catch (err: any) {
      console.error('[Auth Error] Request OTP:', err);
      return res.status(400).json({ error: err.message || 'Failed to send WhatsApp OTP' });
    }
  });

  // 2. Verify WhatsApp OTP
  router.post('/verify-otp', (req: Request, res: Response) => {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ error: 'Phone and OTP are required' });
      }

      const isValid = centralAuth.verifyOtp(phone, otp);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid OTP code. Please re-check.' });
      }

      return res.json({ success: true, message: 'WhatsApp OTP verified successfully' });
    } catch (err: any) {
      console.error('[Auth Error] Verify OTP:', err);
      return res.status(400).json({ error: err.message || 'OTP verification failed' });
    }
  });

  // 3. User completes credential authentication (PIN / password)
  router.post('/login', (req: Request, res: Response) => {
    try {
      const { phone, pin } = req.body;
      if (!phone || !pin) {
        return res.status(400).json({ error: 'Phone and Security PIN are required' });
      }

      const result = centralAuth.loginWithCredentials(phone, pin);
      return res.json({
        success: true,
        token: result.token,
        user: {
          id: result.user.id,
          phone: result.user.phone,
          businessId: result.user.businessId,
          businessName: result.user.businessName,
          businessServerUrl: result.user.businessServerUrl,
        },
      });
    } catch (err: any) {
      console.error('[Auth Error] Login:', err);
      return res.status(401).json({ error: err.message || 'Authentication failed' });
    }
  });

  // 4. Current user session profile
  router.get('/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.substring(7);
    const verified = centralAuth.verifyToken(token);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = centralAuth.getUserById(verified.userId);
    if (!user) {
      return res.status(404).json({ error: 'User record not found' });
    }

    return res.json({
      id: user.id,
      phone: user.phone,
      businessId: user.businessId,
      businessName: user.businessName,
      businessServerUrl: user.businessServerUrl,
    });
  });

  // 5. Logout and token revocation
  router.post('/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      centralAuth.revokeToken(token);
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  // 6. WhatsApp Provider status
  router.get('/provider-status', (req: Request, res: Response) => {
    return res.json(centralAuth.getWhatsAppProviderInfo());
  });

  return router;
}
