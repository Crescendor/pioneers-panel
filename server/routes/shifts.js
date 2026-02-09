import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import db from '../config/database.js';

const router = express.Router();

// Get my shifts
router.get('/me', authenticateToken, (req, res) => {
    try {
        const shifts = db.prepare(`
      SELECT * FROM shifts WHERE user_id = ? ORDER BY shift_date DESC
    `).all(req.user.id);
        res.json(shifts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Get team shifts
router.get('/team/:teamId', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        const shifts = db.prepare(`
      SELECT s.*, u.agent_number, u.full_name
      FROM shifts s JOIN users u ON s.user_id = u.id
      WHERE u.team_id = ? ORDER BY s.shift_date DESC
    `).all(req.params.teamId);
        res.json(shifts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Create single shift
router.post('/', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        const { user_id, shift_date, start_time, end_time, special_status } = req.body;
        const result = db.prepare(`
      INSERT INTO shifts (user_id, shift_date, start_time, end_time, special_status)
      VALUES (?, ?, ?, ?, ?)
    `).run(user_id, shift_date, start_time, end_time, special_status || null);
        res.json({ id: result.lastInsertRowid, message: 'Vardiya oluşturuldu' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Bulk create shifts
router.post('/bulk', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        const { shifts } = req.body;
        const stmt = db.prepare(`
      INSERT INTO shifts (user_id, shift_date, start_time, end_time, special_status)
      VALUES (?, ?, ?, ?, ?)
    `);
        shifts.forEach(s => {
            stmt.run(s.user_id, s.shift_date, s.start_time, s.end_time, s.special_status || null);
        });
        res.json({ message: `${shifts.length} vardiya oluşturuldu` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Update shift
router.put('/:id', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        const { start_time, end_time, special_status } = req.body;
        db.prepare(`
      UPDATE shifts SET start_time = ?, end_time = ?, special_status = ? WHERE id = ?
    `).run(start_time, end_time, special_status || null, req.params.id);
        res.json({ message: 'Vardiya güncellendi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Delete shift
router.delete('/:id', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        db.prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id);
        res.json({ message: 'Vardiya silindi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

export default router;
