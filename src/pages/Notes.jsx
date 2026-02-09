import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Notes() {
    const [notes, setNotes] = useState([]);

    useEffect(() => { loadNotes(); }, []);

    const loadNotes = async () => {
        try {
            const res = await api.get('/notes/me');
            setNotes(res.data);
        } catch (err) { console.error(err); }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📝 Notlar</h1>
                    <p className="page-subtitle">Yönetim tarafından paylaşılan notlar</p>
                </div>
            </div>

            <div className="grid">
                {notes.map(note => (
                    <div key={note.id} className="card">
                        <div className="card-header">
                            <h3 className="card-title">{note.title}</h3>
                            {note.is_global ? <span className="badge badge-primary">Genel</span> : <span className="badge badge-neutral">{note.team_name}</span>}
                        </div>
                        <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{note.content}</p>
                        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                            {note.author_name} • {new Date(note.created_at).toLocaleDateString('tr-TR')}
                        </div>
                    </div>
                ))}
                {notes.length === 0 && (
                    <div className="card empty-state">
                        <div className="empty-state-icon">📝</div>
                        <p className="empty-state-title">Henüz not yok</p>
                    </div>
                )}
            </div>
        </div>
    );
}
