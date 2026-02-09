import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get my breaks today with summary
router.get('/me/today', authenticateToken, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const breaks = db.prepare(`
      SELECT * FROM breaks WHERE user_id = ? AND break_date = ? ORDER BY start_time
    `).all(req.user.id, today);

        const used10 = breaks.filter(b => b.duration_minutes === 10 && b.status !== 'cancelled').length;
        const used30 = breaks.filter(b => b.duration_minutes === 30 && b.status !== 'cancelled').length;

        res.json({
            breaks,
            summary: { remaining10: 6 - used10, remaining30: 1 - used30 }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Get team breaks today
router.get('/team/:teamId/today', authenticateToken, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const breaks = db.prepare(`
      SELECT b.*, u.full_name, u.agent_number
      FROM breaks b JOIN users u ON b.user_id = u.id
      WHERE u.team_id = ? AND b.break_date = ? AND b.status != 'cancelled'
      ORDER BY b.start_time
    `).all(req.params.teamId, today);
        res.json({ breaks });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Schedule a break
router.post('/', authenticateToken, (req, res) => {
    try {
        const { start_time, duration_minutes } = req.body;
        const today = new Date().toISOString().split('T')[0];

        // Check daily limits
        const existing = db.prepare(`
      SELECT duration_minutes FROM breaks WHERE user_id = ? AND break_date = ? AND status != 'cancelled'
    `).all(req.user.id, today);

        const used10 = existing.filter(b => b.duration_minutes === 10).length;
        const used30 = existing.filter(b => b.duration_minutes === 30).length;

        if (duration_minutes === 10 && used10 >= 6) {
            return res.status(400).json({ error: '10 dakikalık mola hakkınız doldu (6/6)' });
        }
        if (duration_minutes === 30 && used30 >= 1) {
            return res.status(400).json({ error: '30 dakikalık mola hakkınız doldu (1/1)' });
        }

        const result = db.prepare(`
      INSERT INTO breaks (user_id, break_date, start_time, duration_minutes)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, today, start_time, duration_minutes);

        res.json({ id: result.lastInsertRowid, message: 'Mola planlandı' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Start break
router.put('/:id/start', authenticateToken, (req, res) => {
    try {
        db.prepare(`
      UPDATE breaks SET status = 'active', actual_start = datetime('now') WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);

        // Pause work session
        db.prepare(`
      UPDATE work_sessions SET status = 'paused' WHERE user_id = ? AND session_date = date('now') AND status = 'active'
    `).run(req.user.id);

        res.json({ message: 'Mola başladı' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// End break
router.put('/:id/end', authenticateToken, (req, res) => {
    try {
        db.prepare(`
      UPDATE breaks SET status = 'completed', actual_end = datetime('now') WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);

        // Resume work session
        db.prepare(`
      UPDATE work_sessions SET status = 'active' WHERE user_id = ? AND session_date = date('now') AND status = 'paused'
    `).run(req.user.id);

        res.json({ message: 'Mola bitti' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Cancel break
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        db.prepare(`
      UPDATE breaks SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status = 'scheduled'
    `).run(req.params.id, req.user.id);
        res.json({ message: 'Mola iptal edildi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

export default router;
