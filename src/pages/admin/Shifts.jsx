import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function AdminShifts() {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ shift_date: '', start_time: '11:00', end_time: '20:00', special_status: '' });

    useEffect(() => { loadTeams(); }, []);
    useEffect(() => { if (selectedTeam) loadTeamData(); }, [selectedTeam]);

    const loadTeams = async () => {
        const res = await api.get('/teams');
        setTeams(res.data);
        if (user?.role === 'TeamLead') setSelectedTeam(user.team_id);
    };

    const loadTeamData = async () => {
        const [usersRes, shiftsRes] = await Promise.all([
            api.get(`/users/team/${selectedTeam}`),
            api.get(`/shifts/team/${selectedTeam}`)
        ]);
        setUsers(usersRes.data);
        setShifts(shiftsRes.data);
    };

    const toggleUser = (id) => {
        setSelectedUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
    };

    const assignShifts = async () => {
        if (!selectedUsers.length || !form.shift_date) return alert('Kullanıcı ve tarih seçin');
        const shiftsToCreate = selectedUsers.map(user_id => ({
            user_id, shift_date: form.shift_date, start_time: form.start_time, end_time: form.end_time,
            special_status: form.special_status || null
        }));
        await api.post('/shifts/bulk', { shifts: shiftsToCreate });
        setShowForm(false);
        setSelectedUsers([]);
        loadTeamData();
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📆 Vardiya Yönetimi</h1>
                    <p className="page-subtitle">Takım vardiyalarını atayın</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Vardiya Ata</button>
            </div>

            {user?.role === 'SuperAdmin' && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <select className="form-select" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
                        <option value="">Takım seçin...</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            )}

            {selectedTeam && (
                <div className="card table-container">
                    <table className="table">
                        <thead><tr><th>Agent</th><th>İsim</th><th>Son Vardiya</th><th>Seç</th></tr></thead>
                        <tbody>
                            {users.map(u => {
                                const lastShift = shifts.filter(s => s.user_id === u.id).sort((a, b) => b.shift_date.localeCompare(a.shift_date))[0];
                                return (
                                    <tr key={u.id}>
                                        <td>NOT_IZM_{u.agent_number}</td>
                                        <td>{u.full_name}</td>
                                        <td>{lastShift ? `${lastShift.shift_date} ${lastShift.start_time}-${lastShift.end_time}` : '—'}</td>
                                        <td><input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={() => toggleUser(u.id)} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Toplu Vardiya Ata</h3>
                            <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: 16 }}>{selectedUsers.length} kullanıcı seçildi</p>
                            <div className="form-group">
                                <label className="form-label">Tarih</label>
                                <input type="date" className="form-input" value={form.shift_date} onChange={e => setForm({ ...form, shift_date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Vardiya</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" className={`btn ${form.start_time === '11:00' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setForm({ ...form, start_time: '11:00', end_time: '20:00' })}>11:00 - 20:00</button>
                                    <button type="button" className={`btn ${form.start_time === '13:00' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setForm({ ...form, start_time: '13:00', end_time: '22:00' })}>13:00 - 22:00</button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Özel Durum (opsiyonel)</label>
                                <input className="form-input" value={form.special_status} onChange={e => setForm({ ...form, special_status: e.target.value })} placeholder="örn: Toplantı, Eğitim" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={assignShifts}>Ata</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
