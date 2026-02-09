import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import db from '../config/database.js';

const router = express.Router();

// Get all users (SuperAdmin only)
router.get('/', authenticateToken, requireRole('SuperAdmin'), (req, res) => {
    try {
        const users = db.prepare(`
      SELECT u.id, u.agent_number, u.full_name, u.role, u.sub_role, u.team_id, t.name as team_name
      FROM users u LEFT JOIN teams t ON u.team_id = t.id
      ORDER BY u.full_name
    `).all();
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Get users by team
router.get('/team/:teamId', authenticateToken, (req, res) => {
    try {
        const users = db.prepare(`
      SELECT id, agent_number, full_name, role, sub_role FROM users WHERE team_id = ? ORDER BY full_name
    `).all(req.params.teamId);
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Create user (SuperAdmin only)
router.post('/', authenticateToken, requireRole('SuperAdmin'), (req, res) => {
    try {
        const { agent_number, full_name, role, sub_role, team_id } = req.body;
        const password_hash = bcrypt.hashSync(agent_number, 10);

        const result = db.prepare(`
      INSERT INTO users (agent_number, password_hash, full_name, role, sub_role, team_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(agent_number, password_hash, full_name, role || 'Agent', sub_role || null, team_id || null);

        res.json({ id: result.lastInsertRowid, message: 'Kullanıcı oluşturuldu' });
    } catch (err) {
        console.error(err);
        if (err.message?.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Bu agent numarası zaten kullanılıyor' });
        }
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Update user (SuperAdmin only)
router.put('/:id', authenticateToken, requireRole('SuperAdmin'), (req, res) => {
    try {
        const { full_name, role, sub_role, team_id, password } = req.body;

        if (password) {
            const password_hash = bcrypt.hashSync(password, 10);
            db.prepare(`
        UPDATE users SET full_name = ?, role = ?, sub_role = ?, team_id = ?, password_hash = ? WHERE id = ?
      `).run(full_name, role, sub_role || null, team_id || null, password_hash, req.params.id);
        } else {
            db.prepare(`
        UPDATE users SET full_name = ?, role = ?, sub_role = ?, team_id = ? WHERE id = ?
      `).run(full_name, role, sub_role || null, team_id || null, req.params.id);
        }

        res.json({ message: 'Kullanıcı güncellendi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Delete user (SuperAdmin only)
router.delete('/:id', authenticateToken, requireRole('SuperAdmin'), (req, res) => {
    try {
        db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
        res.json({ message: 'Kullanıcı silindi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Change own password
router.put('/change-password/me', authenticateToken, (req, res) => {
    try {
        const { old_password, new_password } = req.body;

        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
        if (!user || !bcrypt.compareSync(old_password, user.password_hash)) {
            return res.status(400).json({ error: 'Mevcut şifre yanlış' });
        }

        const password_hash = bcrypt.hashSync(new_password, 10);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, req.user.id);

        res.json({ message: 'Şifre değiştirildi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

export default router;
