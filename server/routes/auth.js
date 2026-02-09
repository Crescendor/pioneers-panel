import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken, generateToken } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Login
router.post('/login', (req, res) => {
    try {
        const { agent_number, password } = req.body;

        if (!agent_number || !password) {
            return res.status(400).json({ error: 'Agent numarası ve şifre gerekli' });
        }

        const user = db.prepare(
            'SELECT id, agent_number, password_hash, full_name, role, sub_role, team_id FROM users WHERE agent_number = ?'
        ).get(agent_number);

        if (!user) {
            return res.status(401).json({ error: 'Geçersiz agent numarası veya şifre' });
        }

        const validPassword = bcrypt.compareSync(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Geçersiz agent numarası veya şifre' });
        }

        const token = generateToken(user);

        res.json({
            token,
            user: {
                id: user.id,
                agent_number: user.agent_number,
                full_name: user.full_name,
                role: user.role,
                sub_role: user.sub_role,
                team_id: user.team_id
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
    try {
        const user = db.prepare(
            'SELECT id, agent_number, full_name, role, sub_role, team_id FROM users WHERE id = ?'
        ).get(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        res.json({ user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

export default router;
