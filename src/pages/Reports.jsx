import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const CATEGORIES = ['General', 'Technical', 'Other Providers', 'Customer Behavior'];
const IMPACTS = ['High', 'Medium', 'Low'];

export default function Reports() {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ case_id: '', category: 'General', impact: 'Medium', description: '', duration_minutes: '' });
    const [period, setPeriod] = useState('7days');
    const [sort, setSort] = useState('newest');
    const [viewTeam, setViewTeam] = useState(false);

    useEffect(() => { loadReports(); }, [period, sort, viewTeam]);

    const loadReports = async () => {
        try {
            const url = viewTeam && user?.team_id ? `/reports/team/${user.team_id}` : '/reports/me';
            const res = await api.get(url, { params: { period, sort } });
            setReports(res.data);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/reports', { ...form, report_date: new Date().toISOString() });
            setShowForm(false);
            setForm({ case_id: '', category: 'General', impact: 'Medium', description: '', duration_minutes: '' });
            loadReports();
        } catch (err) { alert(err.response?.data?.error || 'Hata'); }
    };

    const toggleUpvote = async (id) => {
        await api.post(`/reports/${id}/upvote`);
        loadReports();
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📊 Raporlarım</h1>
                    <p className="page-subtitle">Sistem raporlamalarınızı yönetin</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Yeni Rapor</button>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select className="form-select" style={{ width: 'auto' }} value={period} onChange={e => setPeriod(e.target.value)}>
                        <option value="today">Bugün</option>
                        <option value="7days">Son 7 gün</option>
                        <option value="15days">Son 15 gün</option>
                        <option value="30days">Son 30 gün</option>
                        <option value="all">Tümü</option>
                    </select>
                    <select className="form-select" style={{ width: 'auto' }} value={sort} onChange={e => setSort(e.target.value)}>
                        <option value="newest">Yeniden Eskiye</option>
                        <option value="oldest">Eskiden Yeniye</option>
                        <option value="upvotes">En Fazla Artılanan</option>
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={viewTeam} onChange={e => setViewTeam(e.target.checked)} />
                        Takım raporları
                    </label>
                </div>
            </div>

            <div className="table-container card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Tarih</th>
                            {viewTeam && <th>Agent</th>}
                            <th>Case ID</th>
                            <th>Kategori</th>
                            <th>Impact</th>
                            <th>Süre</th>
                            <th>+</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map(r => (
                            <tr key={r.id}>
                                <td>{new Date(r.report_date).toLocaleDateString('tr-TR')}</td>
                                {viewTeam && <td>NOT_IZM_{r.agent_number}</td>}
                                <td>{r.case_id}</td>
                                <td><span className="badge badge-neutral">{r.category}</span></td>
                                <td><span className={`badge ${r.impact === 'High' ? 'badge-danger' : r.impact === 'Medium' ? 'badge-warning' : 'badge-success'}`}>{r.impact}</span></td>
                                <td>{r.duration_minutes} dk</td>
                                <td>
                                    <button className={`btn btn-sm ${r.user_upvoted ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleUpvote(r.id)}>
                                        +{r.upvote_count || r.upvotes || 0}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {reports.length === 0 && <div className="empty-state"><p className="empty-state-title">Rapor bulunamadı</p></div>}
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Yeni Rapor</h3>
                            <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
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
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>İptal</button>
                                <button type="submit" className="btn btn-primary">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
