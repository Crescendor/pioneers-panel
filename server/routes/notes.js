import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import db from '../config/database.js';

const router = express.Router();

// Get notes for current user
router.get('/me', authenticateToken, (req, res) => {
    try {
        const notes = db.prepare(`
      SELECT n.*, u.full_name as author_name, t.name as team_name
      FROM notes n 
      JOIN users u ON n.author_id = u.id
      LEFT JOIN teams t ON n.team_id = t.id
      WHERE n.is_global = 1 OR n.team_id = ?
      ORDER BY n.created_at DESC
    `).all(req.user.team_id);
        res.json(notes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Get all notes (admin)
router.get('/', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        let notes;
        if (req.user.role === 'SuperAdmin') {
            notes = db.prepare(`
        SELECT n.*, u.full_name as author_name, t.name as team_name
        FROM notes n JOIN users u ON n.author_id = u.id LEFT JOIN teams t ON n.team_id = t.id
        ORDER BY n.created_at DESC
      `).all();
        } else {
            notes = db.prepare(`
        SELECT n.*, u.full_name as author_name, t.name as team_name
        FROM notes n JOIN users u ON n.author_id = u.id LEFT JOIN teams t ON n.team_id = t.id
        WHERE n.is_global = 1 OR n.team_id = ?
        ORDER BY n.created_at DESC
      `).all(req.user.team_id);
        }
        res.json(notes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Create note
router.post('/', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        const { title, content, team_id, is_global } = req.body;
        const result = db.prepare(`
      INSERT INTO notes (author_id, title, content, team_id, is_global)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, title, content, is_global ? null : (team_id || req.user.team_id), is_global ? 1 : 0);
        res.json({ id: result.lastInsertRowid, message: 'Not oluşturuldu' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Update note
router.put('/:id', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        const { title, content, team_id, is_global } = req.body;
        db.prepare(`
      UPDATE notes SET title = ?, content = ?, team_id = ?, is_global = ? WHERE id = ?
    `).run(title, content, is_global ? null : team_id, is_global ? 1 : 0, req.params.id);
        res.json({ message: 'Not güncellendi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Delete note
router.delete('/:id', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
        res.json({ message: 'Not silindi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

export default router;
