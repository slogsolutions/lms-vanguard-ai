import { Router } from 'express';
import { synthesizeTTS } from '../controllers/ttsController.js';

const router = Router();

router.post('/tts', synthesizeTTS);

export default router;
