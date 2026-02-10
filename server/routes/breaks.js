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

        const totalUsedMinutes = breaks
            .filter(b => b.status !== 'cancelled')
            .reduce((sum, b) => sum + b.duration_minutes, 0);

        res.json({
            breaks,
            summary: {
                usedMinutes: totalUsedMinutes,
                remainingMinutes: 60 - totalUsedMinutes
            }
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

        // Check daily limits (max 60m)
        const existing = db.prepare(`
      SELECT duration_minutes FROM breaks WHERE user_id = ? AND break_date = ? AND status != 'cancelled'
    `).all(req.user.id, today);

        const usedMinutes = existing.reduce((sum, b) => sum + b.duration_minutes, 0);

        if (usedMinutes + duration_minutes > 60) {
            return res.status(400).json({ error: `Günlük mola limitiniz (60 dk) aşılamaz. Kalan: ${60 - usedMinutes} dk` });
        }

        // Conflict check: Team concurrent limit (e.g., 2 people)
        const concurrentBreaks = db.prepare(`
            SELECT COUNT(*) as count 
            FROM breaks b 
            JOIN users u ON b.user_id = u.id 
            WHERE u.team_id = (SELECT team_id FROM users WHERE id = ?) 
            AND b.break_date = ? 
            AND b.start_time = ? 
            AND b.status != 'cancelled'
        `).get(req.user.id, today, start_time);

        if (concurrentBreaks.count >= 2) {
            return res.status(400).json({ error: 'Bu saat dilimi için mola kontenjanı dolu' });
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
      UPDATE breaks SET status = 'active', actual_start = datetime('now', 'localtime') WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);

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
      UPDATE breaks SET status = 'completed', actual_end = datetime('now', 'localtime') WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);

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
