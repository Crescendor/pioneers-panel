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

// Get my shifts (Range) - For Agent MyShifts view
router.get('/user/:userId/range', authenticateToken, (req, res) => {
    try {
        // Allow if self or TeamLead/SuperAdmin
        if (req.user.role === 'Agent' && req.user.id != req.params.userId) {
            return res.status(403).json({ error: 'Yetkisiz işlem' });
        }

        const { start, end } = req.query;
        if (!start || !end) return res.status(400).json({ error: 'Start ve End tarihleri gerekli' });

        const shifts = db.prepare(`
            SELECT * FROM shifts 
            WHERE user_id = ? AND shift_date BETWEEN ? AND ?
            ORDER BY shift_date ASC
        `).all(req.params.userId, start, end);

        res.json(shifts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Get team shifts
router.get('/team/:teamId', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        // STRICT CHECK: Team Lead can only view their own team
        if (req.user.role === 'TeamLead' && String(req.user.team_id) !== String(req.params.teamId)) {
            return res.status(403).json({ error: 'Sadece kendi takımınızı görüntüleyebilirsiniz.' });
        }

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

// Delete shifts by team/date (used for overwrite save)
router.delete('/team/:teamId/date/:date', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        // STRICT CHECK
        if (req.user.role === 'TeamLead' && String(req.user.team_id) !== String(req.params.teamId)) {
            return res.status(403).json({ error: 'Yetkisiz işlem.' });
        }

        // Only delete shifts for users in that team (Double safety)
        db.prepare(`
            DELETE FROM shifts 
            WHERE shift_date = ? AND user_id IN (SELECT id FROM users WHERE team_id = ?)
        `).run(req.params.date, req.params.teamId);

        res.json({ message: 'Günlük vardiyalar temizlendi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});


// Create single shift
router.post('/', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        const { user_id, shift_date, start_time, end_time, special_status } = req.body;

        // STRICT CHECK
        if (req.user.role === 'TeamLead') {
            const targetUser = db.prepare('SELECT team_id FROM users WHERE id = ?').get(user_id);
            if (!targetUser || String(targetUser.team_id) !== String(req.user.team_id)) {
                return res.status(403).json({ error: 'Sadece kendi takımınıza işlem yapabilirsiniz.' });
            }
        }

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

        // STRICT CHECK for Bulk
        if (req.user.role === 'TeamLead') {
            const userIds = [...new Set(shifts.map(s => s.user_id))];
            if (userIds.length > 0) {
                // Safe parameter binding for IN clause
                const placeholders = userIds.map(() => '?').join(',');
                const query = `SELECT COUNT(*) as count FROM users WHERE id IN (${placeholders}) AND team_id != ?`;

                // Spread userIds into valid params, then add team_id at the end
                const unauthorizedCount = db.prepare(query).get(...userIds, req.user.team_id).count;

                if (unauthorizedCount > 0) {
                    return res.status(403).json({ error: 'Listenizde başka takımdan kullanıcılar var.' });
                }
            }
        }

        const stmt = db.prepare(`
      INSERT INTO shifts (user_id, shift_date, start_time, end_time, special_status)
      VALUES (?, ?, ?, ?, ?)
    `);

        const transaction = db.transaction((shiftList) => {
            shiftList.forEach(s => {
                stmt.run(s.user_id, s.shift_date, s.start_time, s.end_time, s.special_status || null);
            });
        });

        transaction(shifts);
        res.json({ message: `${shifts.length} vardiya oluşturuldu` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Update shift
router.put('/:id', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), (req, res) => {
    try {
        // STRICT CHECK
        if (req.user.role === 'TeamLead') {
            const shiftUser = db.prepare(`
                SELECT u.team_id FROM shifts s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.id = ?
             `).get(req.params.id);

            if (!shiftUser || String(shiftUser.team_id) !== String(req.user.team_id)) {
                return res.status(403).json({ error: 'Bu vardiyayı düzenleme yetkiniz yok.' });
            }
        }

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
        // STRICT CHECK
        if (req.user.role === 'TeamLead') {
            const shiftUser = db.prepare(`
                SELECT u.team_id FROM shifts s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.id = ?
             `).get(req.params.id);

            if (!shiftUser || String(shiftUser.team_id) !== String(req.user.team_id)) {
                return res.status(403).json({ error: 'Bu vardiyayı silme yetkiniz yok.' });
            }
        }

        db.prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id);
        res.json({ message: 'Vardiya silindi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

export default router;
