import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import db from '../config/database.js';
import ExcelJS from 'exceljs';

const router = express.Router();

// Get my reports
router.get('/me', authenticateToken, (req, res) => {
    try {
        const reports = db.prepare(`
      SELECT r.*, (SELECT COUNT(*) FROM report_upvotes WHERE report_id = r.id) as upvote_count,
             EXISTS(SELECT 1 FROM report_upvotes WHERE report_id = r.id AND user_id = ?) as user_upvoted
      FROM reports r WHERE r.user_id = ? ORDER BY r.report_date DESC
    `).all(req.user.id, req.user.id);
        res.json(reports);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Get team reports
router.get('/team/:teamId', authenticateToken, (req, res) => {
    try {
        const reports = db.prepare(`
      SELECT r.*, u.agent_number, u.full_name,
             (SELECT COUNT(*) FROM report_upvotes WHERE report_id = r.id) as upvote_count,
             EXISTS(SELECT 1 FROM report_upvotes WHERE report_id = r.id AND user_id = ?) as user_upvoted
      FROM reports r JOIN users u ON r.user_id = u.id
      WHERE u.team_id = ? ORDER BY r.report_date DESC
    `).all(req.user.id, req.params.teamId);
        res.json(reports);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Create report
router.post('/', authenticateToken, (req, res) => {
    try {
        const { case_id, category, impact, description, duration_minutes, report_date } = req.body;
        const result = db.prepare(`
      INSERT INTO reports (user_id, case_id, category, impact, description, duration_minutes, report_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, case_id, category, impact, description, duration_minutes, report_date);
        res.json({ id: result.lastInsertRowid, message: 'Rapor oluşturuldu' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Toggle upvote
router.post('/:id/upvote', authenticateToken, (req, res) => {
    try {
        const existing = db.prepare(`
      SELECT 1 FROM report_upvotes WHERE report_id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

        if (existing) {
            db.prepare(`DELETE FROM report_upvotes WHERE report_id = ? AND user_id = ?`).run(req.params.id, req.user.id);
        } else {
            db.prepare(`INSERT INTO report_upvotes (report_id, user_id) VALUES (?, ?)`).run(req.params.id, req.user.id);
        }

        res.json({ message: existing ? 'Upvote kaldırıldı' : 'Upvote eklendi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Export to Excel
router.get('/export/:teamId', authenticateToken, requireRole('SuperAdmin', 'TeamLead'), async (req, res) => {
    try {
        const reports = db.prepare(`
      SELECT r.*, u.agent_number, u.full_name
      FROM reports r JOIN users u ON r.user_id = u.id
      WHERE u.team_id = ? ORDER BY r.report_date DESC
    `).all(req.params.teamId);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Reports');

        sheet.columns = [
            { header: 'Agent', key: 'agent', width: 20 },
            { header: 'Tarih', key: 'date', width: 12 },
            { header: 'Case ID', key: 'case_id', width: 15 },
            { header: 'Kategori', key: 'category', width: 20 },
            { header: 'Impact', key: 'impact', width: 10 },
            { header: 'Süre (dk)', key: 'duration', width: 10 },
            { header: 'Açıklama', key: 'description', width: 40 }
        ];

        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };

        reports.forEach(r => {
            sheet.addRow({
                agent: `NOT_IZM_${r.agent_number}`,
                date: new Date(r.report_date).toLocaleDateString('tr-TR'),
                case_id: r.case_id,
                category: r.category,
                impact: r.impact,
                duration: r.duration_minutes,
                description: r.description
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=reports.xlsx');
        await workbook.xlsx.write(res);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Delete report
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        db.prepare('DELETE FROM reports WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
        res.json({ message: 'Rapor silindi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

export default router;
