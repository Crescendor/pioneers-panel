import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import db from '../config/database.js';

const router = express.Router();

// Get my requests
router.get('/me', authenticateToken, (req, res) => {
    try {
        const requests = db.prepare(`
      SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user.id);
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Get team requests (admin)
router.get('/team/:teamId', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        const requests = db.prepare(`
      SELECT r.*, u.full_name, u.agent_number
      FROM requests r JOIN users u ON r.user_id = u.id
      WHERE u.team_id = ? ORDER BY r.created_at DESC
    `).all(req.params.teamId);
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Create request
router.post('/', authenticateToken, (req, res) => {
    try {
        const { category, description } = req.body;
        const result = db.prepare(`
      INSERT INTO requests (user_id, category, description)
      VALUES (?, ?, ?)
    `).run(req.user.id, category, description);
        res.json({ id: result.lastInsertRowid, message: 'Talep gönderildi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Respond to request (admin)
router.put('/:id/respond', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        const { status, response } = req.body;
        db.prepare(`
      UPDATE requests SET status = ?, response = ?, responded_by = ?, responded_at = datetime('now')
      WHERE id = ?
    `).run(status, response, req.user.id, req.params.id);
        res.json({ message: 'Talep yanıtlandı' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Cancel own request
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        db.prepare(`
      DELETE FROM requests WHERE id = ? AND user_id = ? AND status = 'pending'
    `).run(req.params.id, req.user.id);
        res.json({ message: 'Talep iptal edildi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

export default router;
