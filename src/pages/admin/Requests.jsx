import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function AdminRequests() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [filter, setFilter] = useState('pending');
    const [showResponse, setShowResponse] = useState(null);
    const [response, setResponse] = useState('');

    useEffect(() => { loadRequests(); }, [filter]);

    const loadRequests = async () => {
        const teamId = user?.team_id || 1;
        const res = await api.get(`/requests/team/${teamId}`, { params: { status: filter !== 'all' ? filter : undefined } });
        setRequests(res.data);
    };

    const respondToRequest = async (id, status) => {
        await api.put(`/requests/${id}/respond`, { status, response });
        setShowResponse(null);
        setResponse('');
        loadRequests();
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">✉️ Talep Yönetimi</h1>
                    <p className="page-subtitle">Agent taleplerini yönetin</p>
                </div>
                <div className="tabs" style={{ marginBottom: 0, border: 'none' }}>
                    {['pending', 'approved', 'rejected', 'all'].map(f => (
                        <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                            {f === 'pending' ? 'Bekleyen' : f === 'approved' ? 'Onaylanan' : f === 'rejected' ? 'Reddedilen' : 'Tümü'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid">
                {requests.map(req => (
                    <div key={req.id} className="card">
                        <div className="card-header">
                            <div>
                                <span style={{ fontWeight: 600 }}>{req.full_name}</span>
                                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>NOT_IZM_{req.agent_number}</span>
                            </div>
                            <span className={`badge ${req.status === 'approved' ? 'badge-success' : req.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                                {req.status === 'pending' ? 'Bekliyor' : req.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                            </span>
                        </div>
                        <span className="badge badge-neutral" style={{ marginBottom: 8 }}>{req.category}</span>
                        <p style={{ color: 'var(--text-secondary)', margin: '8px 0' }}>{req.description}</p>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{new Date(req.created_at).toLocaleString('tr-TR')}</div>
                        {req.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-success btn-sm" onClick={() => setShowResponse(req)}>Yanıtla</button>
                            </div>
                        )}
                    </div>
                ))}
                {requests.length === 0 && <div className="card empty-state"><p className="empty-state-title">Talep bulunamadı</p></div>}
            </div>

            {showResponse && (
                <div className="modal-overlay" onClick={() => setShowResponse(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Talebe Yanıt Ver</h3>
                            <button className="modal-close" onClick={() => setShowResponse(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p><strong>{showResponse.full_name}</strong> - {showResponse.category}</p>
                            <p style={{ color: 'var(--text-secondary)', margin: '12px 0' }}>{showResponse.description}</p>
                            <div className="form-group">
                                <label className="form-label">Yanıt (opsiyonel)</label>
                                <textarea className="form-textarea" value={response} onChange={e => setResponse(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-danger" onClick={() => respondToRequest(showResponse.id, 'rejected')}>Reddet</button>
                            <button className="btn btn-success" onClick={() => respondToRequest(showResponse.id, 'approved')}>Onayla</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
