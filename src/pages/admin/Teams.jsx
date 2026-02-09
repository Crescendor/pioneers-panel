import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function AdminTeams() {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', leader_id: '', max_concurrent_breaks: 2, max_overlap_tolerance: 1 });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [teamsRes, usersRes] = await Promise.all([
            api.get('/teams'),
            user?.role === 'SuperAdmin' ? api.get('/users') : { data: [] }
        ]);
        setTeams(teamsRes.data);
        setUsers(usersRes.data);
    };

    const openCreate = () => {
        setSelectedTeam(null);
        setForm({ name: '', leader_id: '', max_concurrent_breaks: 2, max_overlap_tolerance: 1 });
        setShowModal(true);
    };

    const openEdit = (team) => {
        setSelectedTeam(team);
        setForm({ name: team.name, leader_id: team.leader_id || '', max_concurrent_breaks: team.max_concurrent_breaks, max_overlap_tolerance: team.max_overlap_tolerance });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedTeam) {
                await api.put(`/teams/${selectedTeam.id}`, form);
            } else {
                await api.post('/teams', form);
            }
            setShowModal(false);
            loadData();
        } catch (err) { alert(err.response?.data?.error || 'Hata'); }
    };

    const viewTeamDetails = async (teamId) => {
        const res = await api.get(`/teams/${teamId}`);
        setSelectedTeam(res.data);
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🏢 Takımlar</h1>
                    <p className="page-subtitle">Takımları yönetin</p>
                </div>
                {user?.role === 'SuperAdmin' && <button className="btn btn-primary" onClick={openCreate}>+ Takım Ekle</button>}
            </div>

            <div className="grid grid-3">
                {teams.map(team => (
                    <div key={team.id} className="card" style={{ cursor: 'pointer' }} onClick={() => viewTeamDetails(team.id)}>
                        <h3 className="card-title">{team.name}</h3>
                        <div style={{ marginTop: 12 }}>
                            <p style={{ color: 'var(--text-secondary)' }}>Lider: {team.leader_name || '—'}</p>
                            <p style={{ color: 'var(--text-secondary)' }}>Üye: {team.member_count}</p>
                        </div>
                        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                            <span className="badge badge-neutral">Max mola: {team.max_concurrent_breaks}</span>
                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(team); }}>Düzenle</button>
                        </div>
                    </div>
                ))}
            </div>

            {selectedTeam?.members && (
                <div className="card" style={{ marginTop: 24 }}>
                    <h3 className="card-title">{selectedTeam.name} - Üyeler</h3>
                    <div className="table-container" style={{ marginTop: 16 }}>
                        <table className="table">
                            <thead><tr><th>Agent</th><th>İsim</th><th>Rol</th><th>Mesai Durumu</th></tr></thead>
                            <tbody>
                                {selectedTeam.members.map(m => (
                                    <tr key={m.id}>
                                        <td>NOT_IZM_{m.agent_number}</td>
                                        <td>{m.full_name} {m.sub_role && <span className="badge badge-primary">{m.sub_role}</span>}</td>
                                        <td>{m.role}</td>
                                        <td>
                                            <span className={`status-dot ${m.session_status === 'active' ? 'status-active' : m.session_status === 'paused' ? 'status-paused' : 'status-idle'}`}></span>
                                            {m.session_status === 'active' ? 'Aktif' : m.session_status === 'paused' ? 'Molada' : 'Başlamadı'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{selectedTeam && !selectedTeam.members ? 'Takım Düzenle' : 'Takım Ekle'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {user?.role === 'SuperAdmin' && (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Takım Adı</label>
                                            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Takım Lideri</label>
                                            <select className="form-select" value={form.leader_id} onChange={e => setForm({ ...form, leader_id: e.target.value })}>
                                                <option value="">Seçin...</option>
                                                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Max Eşzamanlı Mola</label>
                                    <input type="number" className="form-input" value={form.max_concurrent_breaks} onChange={e => setForm({ ...form, max_concurrent_breaks: parseInt(e.target.value) })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Çakışma Toleransı</label>
                                    <input type="number" className="form-input" value={form.max_overlap_tolerance} onChange={e => setForm({ ...form, max_overlap_tolerance: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                                <button type="submit" className="btn btn-primary">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
