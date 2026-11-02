import { Router, Request, Response } from 'express';
import { CentralAuthService } from './centralAuthService';

export function createCentralAuthRouter(centralAuth: CentralAuthService): Router {
  const router = Router();

  // 1. Request OTP (Local generation, masked response)
  router.post('/request-otp', async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: 'Mobile number is required' });
      }

      const result = await centralAuth.requestOtp(phone);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to generate OTP' });
    }
  });

  // 2. Verify OTP
  router.post('/verify-otp', (req: Request, res: Response) => {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ error: 'Phone and OTP are required' });
      }

      const isValid = centralAuth.verifyOtp(phone, otp);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid OTP code. Please check and retry.' });
      }

      return res.json({ success: true, message: 'OTP verified successfully' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'OTP verification failed' });
    }
  });

  // 3. User Login
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
      return res.status(401).json({ error: err.message || 'Authentication failed' });
    }
  });

  // 4. Session Verification
  router.get('/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.substring(7);
    const verified = centralAuth.verifyToken(token);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
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

  // 5. Logout & Session Revocation
  router.post('/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      centralAuth.revokeToken(token);
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  // 6. Business Server Discovery: Resolve Registered Address
  router.get('/discover/:businessId', (req: Request, res: Response) => {
    const businessId = req.params.businessId;
    const server = centralAuth.resolveBusinessServer(businessId);
    if (!server) {
      return res.status(404).json({ error: `Business server '${businessId}' not registered` });
    }
    return res.json(server);
  });

  // 7. Business Server Self-Registration
  router.post('/register-server', (req: Request, res: Response) => {
    try {
      const { businessId, businessName, serverUrl } = req.body;
      if (!businessId || !businessName || !serverUrl) {
        return res.status(400).json({ error: 'businessId, businessName, and serverUrl are required' });
      }

      const registration = centralAuth.registerBusinessServer(businessId, businessName, serverUrl);
      return res.status(201).json(registration);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Server registration failed' });
    }
  });

  return router;
}
