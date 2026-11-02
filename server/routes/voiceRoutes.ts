import { Router, Request, Response } from 'express';
import { VoiceExtractionService } from '../voice/voiceExtractionService';

export function createVoiceRouter(): Router {
  const router = Router();
  const voiceService = new VoiceExtractionService();

  router.post('/extract', async (req: Request, res: Response) => {
    try {
      const { transcript, today } = req.body;
      if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({ error: 'Audio transcript text is required' });
      }

      const extracted = await voiceService.extractFromTranscript(transcript, today);
      if (extracted.isAmbiguous) {
        return res.status(422).json({
          success: false,
          error: extracted.ambiguityReason || 'Spoken input is ambiguous or lacks actionable lead information',
          extracted,
        });
      }

      return res.json({
        success: true,
        extracted,
      });
    } catch (err: any) {
      console.error('[Voice API Error]:', err);
      return res.status(500).json({ error: err.message || 'Failed to process voice transcript' });
    }
  });

  return router;
}
