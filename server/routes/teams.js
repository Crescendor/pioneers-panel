import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import db from '../config/database.js';

const router = express.Router();

// Get all teams
router.get('/', authenticateToken, (req, res) => {
    try {
        const teams = db.prepare(`
      SELECT t.id, t.name, t.leader_id, t.max_concurrent_breaks, t.max_overlap_tolerance,
             u.full_name as leader_name,
             (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
      FROM teams t LEFT JOIN users u ON t.leader_id = u.id
    `).all();
        res.json(teams);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Get team by ID with members
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const team = db.prepare(`
      SELECT t.id, t.name, t.leader_id, t.max_concurrent_breaks, t.max_overlap_tolerance,
             u.full_name as leader_name
      FROM teams t LEFT JOIN users u ON t.leader_id = u.id WHERE t.id = ?
    `).get(req.params.id);

        if (!team) return res.status(404).json({ error: 'Takım bulunamadı' });

        const members = db.prepare(`
      SELECT u.id, u.agent_number, u.full_name, u.role, u.sub_role,
             ws.status as session_status
      FROM users u LEFT JOIN work_sessions ws ON u.id = ws.user_id 
           AND ws.session_date = date('now')
      WHERE u.team_id = ?
    `).all(req.params.id);

        res.json({ ...team, members });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Create team (SuperAdmin)
router.post('/', authenticateToken, requireRole('SuperAdmin'), (req, res) => {
    try {
        const { name, leader_id, max_concurrent_breaks, max_overlap_tolerance } = req.body;
        const result = db.prepare(`
      INSERT INTO teams (name, leader_id, max_concurrent_breaks, max_overlap_tolerance)
      VALUES (?, ?, ?, ?)
    `).run(name, leader_id || null, max_concurrent_breaks || 2, max_overlap_tolerance || 1);
        res.json({ id: result.lastInsertRowid, message: 'Takım oluşturuldu' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Update team
router.put('/:id', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        const { name, leader_id, max_concurrent_breaks, max_overlap_tolerance } = req.body;
        db.prepare(`
      UPDATE teams SET name = ?, leader_id = ?, max_concurrent_breaks = ?, max_overlap_tolerance = ? WHERE id = ?
    `).run(name, leader_id, max_concurrent_breaks, max_overlap_tolerance, req.params.id);
        res.json({ message: 'Takım güncellendi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Delete team (SuperAdmin)
router.delete('/:id', authenticateToken, requireRole('SuperAdmin'), (req, res) => {
    try {
        db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
        res.json({ message: 'Takım silindi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

export default router;
