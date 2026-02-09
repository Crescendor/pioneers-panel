import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get all suggestions
router.get('/', authenticateToken, (req, res) => {
    try {
        const suggestions = db.prepare(`
      SELECT s.*, u.full_name FROM suggestions s JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `).all();
        res.json(suggestions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Create suggestion
router.post('/', authenticateToken, (req, res) => {
    try {
        const { content } = req.body;
        const result = db.prepare(`
      INSERT INTO suggestions (user_id, content) VALUES (?, ?)
    `).run(req.user.id, content);
        res.json({ id: result.lastInsertRowid, message: 'Öneri gönderildi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Delete suggestion
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const suggestion = db.prepare('SELECT user_id FROM suggestions WHERE id = ?').get(req.params.id);
        if (!suggestion) return res.status(404).json({ error: 'Öneri bulunamadı' });

        if (suggestion.user_id !== req.user.id && req.user.role !== 'SuperAdmin') {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }

        db.prepare('DELETE FROM suggestions WHERE id = ?').run(req.params.id);
        res.json({ message: 'Öneri silindi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

export default router;
