import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get current session
router.get('/current', authenticateToken, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const session = db.prepare(`
      SELECT * FROM work_sessions WHERE user_id = ? AND session_date = ?
    `).get(req.user.id, today);

        const activeBreak = db.prepare(`
      SELECT * FROM breaks WHERE user_id = ? AND break_date = ? AND status = 'active'
    `).get(req.user.id, today);

        res.json({ session, activeBreak });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Start shift
router.post('/start', authenticateToken, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const existing = db.prepare(`
      SELECT id FROM work_sessions WHERE user_id = ? AND session_date = ?
    `).get(req.user.id, today);

        if (existing) {
            db.prepare(`
        UPDATE work_sessions SET status = 'active' WHERE id = ?
      `).run(existing.id);
        } else {
            db.prepare(`
        INSERT INTO work_sessions (user_id, session_date, start_time, status)
        VALUES (?, ?, datetime('now'), 'active')
      `).run(req.user.id, today);
        }

        res.json({ message: 'Vardiya başlatıldı' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Pause shift
router.post('/pause', authenticateToken, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        db.prepare(`
      UPDATE work_sessions SET status = 'paused' WHERE user_id = ? AND session_date = ? AND status = 'active'
    `).run(req.user.id, today);
        res.json({ message: 'Vardiya duraklatıldı' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Resume shift
router.post('/resume', authenticateToken, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        db.prepare(`
      UPDATE work_sessions SET status = 'active' WHERE user_id = ? AND session_date = ? AND status = 'paused'
    `).run(req.user.id, today);
        res.json({ message: 'Vardiya devam ettiriliyor' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// End shift
router.post('/end', authenticateToken, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        db.prepare(`
      UPDATE work_sessions SET status = 'completed', end_time = datetime('now') WHERE user_id = ? AND session_date = ?
    `).run(req.user.id, today);
        res.json({ message: 'Vardiya bitirildi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

export default router;
