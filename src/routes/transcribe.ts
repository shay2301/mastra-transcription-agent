import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { TranscriberAgent } from '../agent/TranscriberAgent.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/uploads',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max upload (will be processed down)
  },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.mp3', '.m4a', '.wav', '.ogg', '.webm', '.flac'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedExts.join(', ')}`));
    }
  },
});

export function createTranscribeRouter(agent: TranscriberAgent): Router {
  /**
   * POST /api/transcribe
   * Transcribe an uploaded audio file
   */
  router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const { language = 'auto', timestamps = 'segments', diarize = 'false' } = req.body;

      console.log(`[API] Transcribe request:`, {
        filename: req.file.originalname,
        size: req.file.size,
        language,
        timestamps,
      });

      // Transcribe using agent
      const result = await agent.transcribeFile(req.file.path, {
        language,
        timestamps,
      });

      // Cleanup uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('[API] Failed to cleanup upload:', err);
      }

      // Return result
      res.json({
        success: true,
        text: result.text,
        vtt: result.vtt,
        segments: result.segments,
        meta: {
          ...result.meta,
          filename: req.file.originalname,
          originalSize: req.file.size,
          processingTimeMs: Date.now() - startTime,
        },
      });
    } catch (error: any) {
      console.error('[API] Transcription error:', error);

      // Cleanup uploaded file on error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('[API] Failed to cleanup upload on error:', err);
        }
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Transcription failed',
      });
    }
  });

  /**
   * GET /api/health
   * Health check endpoint
   */
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
