import { useState, useEffect } from 'react';
import api from '../utils/api';

const CATEGORIES = ['İzin', 'Geç Kalma', 'Erken Çıkma', 'Şirket İçi', 'Diğer'];

export default function Requests() {
    const [requests, setRequests] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ category: 'İzin', description: '' });

    useEffect(() => { loadRequests(); }, []);

    const loadRequests = async () => {
        try {
            const res = await api.get('/requests/me');
            setRequests(res.data);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/requests', form);
            setShowForm(false);
            setForm({ category: 'İzin', description: '' });
            loadRequests();
        } catch (err) { alert(err.response?.data?.error || 'Hata'); }
    };

    const cancelRequest = async (id) => {
        await api.delete(`/requests/${id}`);
        loadRequests();
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📨 Talepler</h1>
                    <p className="page-subtitle">Takım liderinize talep gönderin</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Yeni Talep</button>
            </div>

            <div className="grid">
                {requests.map(req => (
                    <div key={req.id} className="card">
                        <div className="card-header">
                            <span className="badge badge-neutral">{req.category}</span>
                            <span className={`badge ${req.status === 'approved' ? 'badge-success' : req.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                                {req.status === 'pending' ? 'Bekliyor' : req.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                            </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', margin: '12px 0' }}>{req.description}</p>
                        {req.response && (
                            <div style={{ padding: 12, background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
                                <strong>Yanıt:</strong> {req.response}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(req.created_at).toLocaleDateString('tr-TR')}</span>
                            {req.status === 'pending' && <button className="btn btn-danger btn-sm" onClick={() => cancelRequest(req.id)}>İptal</button>}
                        </div>
                    </div>
                ))}
                {requests.length === 0 && (
                    <div className="card empty-state">
                        <div className="empty-state-icon">📨</div>
                        <p className="empty-state-title">Henüz talep yok</p>
                    </div>
                )}
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Yeni Talep</h3>
                            <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Kategori</label>
                                    <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Açıklama</label>
                                    <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>İptal</button>
                                <button type="submit" className="btn btn-primary">Gönder</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
