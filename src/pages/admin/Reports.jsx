import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const CATEGORIES = ['General', 'Technical', 'Other Providers', 'Customer Behavior'];
const IMPACTS = ['High', 'Medium', 'Low'];

export default function AdminReports() {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [period, setPeriod] = useState('7days');
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);

    // Edit Modal State
    const [showEdit, setShowEdit] = useState(false);
    const [editingReport, setEditingReport] = useState(null);
    const [form, setForm] = useState({ case_id: '', category: 'General', impact: 'Medium', description: '', duration_minutes: '' });

    useEffect(() => { loadTeams(); }, []);
    useEffect(() => { if (selectedTeam) loadReports(); }, [selectedTeam, period]);

    const loadTeams = async () => {
        try {
            const res = await api.get('/teams');
            setTeams(res.data);
            if (user?.role === 'TeamLead') setSelectedTeam(user.team_id);
        } catch (err) { console.error(err); }
    };

    const loadReports = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reports/team/${selectedTeam}`, { params: { period } });
            setReports(res.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const downloadReport = async () => {
        if (!selectedTeam) return alert('Takım seçin');
        try {
            // Fix: Use axios to get the file with auth headers
            const res = await api.get(`/reports/export/${selectedTeam}`, {
                params: { period },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reports_team_${selectedTeam}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('İndirme başarısız oldu');
        }
    };

    const handleOpenEdit = (report) => {
        setEditingReport(report);
        setForm({
            case_id: report.case_id,
            category: report.category,
            impact: report.impact,
            description: report.description,
            duration_minutes: report.duration_minutes
        });
        setShowEdit(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/reports/${editingReport.id}`, { ...form, report_date: editingReport.report_date });
            setShowEdit(false);
            loadReports();
        } catch (err) { alert('Hata oluştu'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Bu raporu silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/reports/${id}`);
            loadReports();
        } catch (err) { alert('Hata oluştu'); }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📊 Rapor Yönetimi</h1>
                    <p className="page-subtitle">Takım raporlarını inceleyin ve yönetin</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={downloadReport} disabled={!selectedTeam}>📥 Excel İndir</button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    {user?.role === 'SuperAdmin' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label className="form-label" style={{ marginBottom: 0 }}>Takım:</label>
                            <select className="form-select" style={{ width: 'auto' }} value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
                                <option value="">Takım Seçin...</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Dönem:</label>
                        <select className="form-select" style={{ width: 'auto' }} value={period} onChange={e => setPeriod(e.target.value)}>
                            <option value="today">Bugün</option>
                            <option value="7days">Son 7 gün</option>
                            <option value="30days">Son 30 gün</option>
                            <option value="all">Tümü</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="table-container card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Tarih</th>
                            <th>Agent</th>
                            <th>Case ID</th>
                            <th>Kategori</th>
                            <th>Impact</th>
                            <th>Süre</th>
                            <th>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map(r => (
                            <tr key={r.id}>
                                <td>{new Date(r.report_date).toLocaleDateString('tr-TR')}</td>
                                <td>{r.full_name} ({r.agent_number})</td>
                                <td>{r.case_id}</td>
                                <td>{r.category}</td>
                                <td><span className={`badge ${r.impact === 'High' ? 'badge-danger' : r.impact === 'Medium' ? 'badge-warning' : 'badge-success'}`}>{r.impact}</span></td>
                                <td>{r.duration_minutes} dk</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button className="btn btn-sm btn-ghost" onClick={() => handleOpenEdit(r)}>Düzenle</button>
                                        <button className="btn btn-sm btn-ghost text-danger" onClick={() => handleDelete(r.id)}>Sil</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!selectedTeam && <div className="empty-state"><p className="empty-state-title">Lütfen bir takım seçin</p></div>}
                {selectedTeam && reports.length === 0 && !loading && <div className="empty-state"><p className="empty-state-title">Kayıt bulunamadı</p></div>}
                {loading && <div className="empty-state"><div className="spinner"></div></div>}
            </div>

            {showEdit && (
                <div className="modal-overlay" onClick={() => setShowEdit(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Raporu Düzenle</h3>
                            <button className="modal-close" onClick={() => setShowEdit(false)}>×</button>
                        </div>
                        <form onSubmit={handleUpdate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Case ID</label>
                                    <input className="form-input" value={form.case_id} onChange={e => setForm({ ...form, case_id: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Kategori</label>
                                    <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Impact</label>
                                    <select className="form-select" value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })}>
                                        {IMPACTS.map(i => <option key={i} value={i}>{i}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Açıklama</label>
                                    <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Süre (dakika)</label>
                                    <input type="number" className="form-input" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} required />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>İptal</button>
                                <button type="submit" className="btn btn-primary">Güncelle</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
