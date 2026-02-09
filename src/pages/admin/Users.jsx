import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [form, setForm] = useState({ agent_number: '', full_name: '', role: 'Agent', sub_role: '', team_id: '', password: '' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [usersRes, teamsRes] = await Promise.all([api.get('/users'), api.get('/teams')]);
        setUsers(usersRes.data);
        setTeams(teamsRes.data);
    };

    const openCreate = () => {
        setEditUser(null);
        setForm({ agent_number: '', full_name: '', role: 'Agent', sub_role: '', team_id: '', password: '' });
        setShowModal(true);
    };

    const openEdit = (user) => {
        setEditUser(user);
        setForm({ agent_number: user.agent_number, full_name: user.full_name, role: user.role, sub_role: user.sub_role || '', team_id: user.team_id || '', password: '' });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editUser) {
                await api.put(`/users/${editUser.id}`, form);
            } else {
                await api.post('/users', form);
            }
            setShowModal(false);
            loadData();
        } catch (err) { alert(err.response?.data?.error || 'Hata'); }
    };

    const deleteUser = async (id) => {
        if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
        await api.delete(`/users/${id}`);
        loadData();
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">👥 Kullanıcılar</h1>
                    <p className="page-subtitle">Tüm kullanıcıları yönetin</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>+ Kullanıcı Ekle</button>
            </div>

            <div className="card table-container">
                <table className="table">
                    <thead>
                        <tr><th>Agent No</th><th>İsim</th><th>Takım</th><th>Rol</th><th>Sub Rol</th><th>İşlem</th></tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td>NOT_IZM_{u.agent_number}</td>
                                <td>{u.full_name}</td>
                                <td>{u.team_name || '—'}</td>
                                <td><span className={`badge ${u.role === 'SuperAdmin' ? 'badge-danger' : u.role === 'TeamLead' ? 'badge-primary' : 'badge-neutral'}`}>{u.role}</span></td>
                                <td>{u.sub_role || '—'}</td>
                                <td>
                                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>Düzenle</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>Sil</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editUser ? 'Kullanıcı Düzenle' : 'Kullanıcı Ekle'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {!editUser && (
                                    <div className="form-group">
                                        <label className="form-label">Agent Numarası</label>
                                        <input className="form-input" value={form.agent_number} onChange={e => setForm({ ...form, agent_number: e.target.value })} required />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">İsim Soyisim</label>
                                    <input className="form-input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Takım</label>
                                    <select className="form-select" value={form.team_id} onChange={e => setForm({ ...form, team_id: e.target.value })}>
                                        <option value="">Takım yok</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Rol</label>
                                    <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                        <option value="Agent">Agent</option>
                                        <option value="TeamLead">Takım Lideri</option>
                                        <option value="SuperAdmin">Super Admin</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sub Rol (opsiyonel)</label>
                                    <input className="form-input" value={form.sub_role} onChange={e => setForm({ ...form, sub_role: e.target.value })} />
                                </div>
                                {editUser && (
                                    <div className="form-group">
                                        <label className="form-label">Yeni Şifre (boş bırakılırsa değişmez)</label>
                                        <input type="password" className="form-input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                                    </div>
                                )}
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
