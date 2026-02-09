import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function AdminNotes() {
    const { user } = useAuth();
    const [notes, setNotes] = useState([]);
    const [teams, setTeams] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editNote, setEditNote] = useState(null);
    const [form, setForm] = useState({ title: '', content: '', team_id: '', is_global: false });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [notesRes, teamsRes] = await Promise.all([api.get('/notes'), api.get('/teams')]);
        setNotes(notesRes.data);
        setTeams(teamsRes.data);
    };

    const openCreate = () => {
        setEditNote(null);
        setForm({ title: '', content: '', team_id: user?.role === 'TeamLead' ? user.team_id : '', is_global: false });
        setShowForm(true);
    };

    const openEdit = (note) => {
        setEditNote(note);
        setForm({ title: note.title, content: note.content, team_id: note.team_id || '', is_global: !!note.is_global });
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editNote) {
                await api.put(`/notes/${editNote.id}`, form);
            } else {
                await api.post('/notes', form);
            }
            setShowForm(false);
            loadData();
        } catch (err) { alert(err.response?.data?.error || 'Hata'); }
    };

    const deleteNote = async (id) => {
        if (!confirm('Bu notu silmek istediğinize emin misiniz?')) return;
        await api.delete(`/notes/${id}`);
        loadData();
    };

    return (
        <div className="page">
            <div className="page-header">
                <div><h1 className="page-title">📋 Not Yönetimi</h1></div>
                <button className="btn btn-primary" onClick={openCreate}>+ Not Ekle</button>
            </div>

            <div className="grid">
                {notes.map(note => (
                    <div key={note.id} className="card">
                        <div className="card-header">
                            <h3 className="card-title">{note.title}</h3>
                            {note.is_global ? <span className="badge badge-primary">Genel</span> : <span className="badge badge-neutral">{note.team_name}</span>}
                        </div>
                        <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{note.content}</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(note)}>Düzenle</button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteNote(note.id)}>Sil</button>
                        </div>
                    </div>
                ))}
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editNote ? 'Not Düzenle' : 'Not Ekle'}</h3>
                            <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Başlık</label>
                                    <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">İçerik</label>
                                    <textarea className="form-textarea" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
                                </div>
                                {user?.role === 'SuperAdmin' && (
                                    <>
                                        <div className="form-group">
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input type="checkbox" checked={form.is_global} onChange={e => setForm({ ...form, is_global: e.target.checked })} />
                                                Tüm takımlara gönder
                                            </label>
                                        </div>
                                        {!form.is_global && (
                                            <div className="form-group">
                                                <label className="form-label">Takım</label>
                                                <select className="form-select" value={form.team_id} onChange={e => setForm({ ...form, team_id: e.target.value })}>
                                                    <option value="">Seçin...</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </>
                                )}
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
