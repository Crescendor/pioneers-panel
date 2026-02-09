import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Breaks() {
    const { user } = useAuth();
    const [breaks, setBreaks] = useState([]);
    const [summary, setSummary] = useState(null);
    const [teamBreaks, setTeamBreaks] = useState([]);
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedDuration, setSelectedDuration] = useState(10);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [myRes, teamRes] = await Promise.all([
                api.get('/breaks/me/today'),
                user?.team_id ? api.get(`/breaks/team/${user.team_id}/today`) : { data: { breaks: [] } }
            ]);
            setBreaks(myRes.data.breaks);
            setSummary(myRes.data.summary);
            setTeamBreaks(teamRes.data.breaks || []);
        } catch (err) { console.error(err); }
    };

    const scheduleBreak = async () => {
        if (!selectedTime) return alert('Lütfen bir saat seçin');
        try {
            await api.post('/breaks', { start_time: selectedTime, duration_minutes: selectedDuration });
            setSelectedTime('');
            loadData();
        } catch (err) { alert(err.response?.data?.error || 'Hata'); }
    };

    const startBreak = async (id) => {
        await api.put(`/breaks/${id}/start`);
        loadData();
    };
    const endBreak = async (id) => {
        await api.put(`/breaks/${id}/end`);
        loadData();
    };
    const cancelBreak = async (id) => {
        await api.delete(`/breaks/${id}`);
        loadData();
    };

    const timeSlots = [];
    for (let h = 11; h <= 22; h++) {
        timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
        if (h < 22) timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
    }

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">☕ Molalarım</h1>
                    <p className="page-subtitle">Günlük mola haklarınızı yönetin</p>
                </div>
            </div>

            <div className="grid grid-2">
                <div className="card">
                    <h3 className="card-title">Mola Planla</h3>
                    <div style={{ marginTop: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Saat</label>
                            <select className="form-select" value={selectedTime} onChange={e => setSelectedTime(e.target.value)}>
                                <option value="">Seçin...</option>
                                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Süre</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className={`btn ${selectedDuration === 10 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSelectedDuration(10)}>10 dk</button>
                                <button className={`btn ${selectedDuration === 30 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSelectedDuration(30)}>30 dk</button>
                            </div>
                        </div>
                        <button className="btn btn-success" onClick={scheduleBreak}>Mola Planla</button>
                    </div>
                    {summary && (
                        <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span>30 dk mola:</span><span>{1 - summary.remaining30}/1 kullanıldı</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>10 dk mola:</span><span>{6 - summary.remaining10}/6 kullanıldı</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="card">
                    <h3 className="card-title">Bugünkü Molalarım</h3>
                    <div style={{ marginTop: 16 }}>
                        {breaks.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Planlanmış mola yok.</p>}
                        {breaks.map(b => (
                            <div key={b.id} style={{ padding: 12, background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>{b.start_time}</span>
                                    <span className={`badge ${b.status === 'active' ? 'badge-warning' : b.status === 'completed' ? 'badge-success' : 'badge-neutral'}`} style={{ marginLeft: 8 }}>
                                        {b.duration_minutes} dk - {b.status === 'scheduled' ? 'Planlandı' : b.status === 'active' ? 'Aktif' : b.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {b.status === 'scheduled' && <button className="btn btn-success btn-sm" onClick={() => startBreak(b.id)}>Başlat</button>}
                                    {b.status === 'active' && <button className="btn btn-warning btn-sm" onClick={() => endBreak(b.id)}>Bitir</button>}
                                    {b.status === 'scheduled' && <button className="btn btn-danger btn-sm" onClick={() => cancelBreak(b.id)}>İptal</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
                <h3 className="card-title">Takım Mola Durumu</h3>
                <div className="timeline" style={{ marginTop: 16 }}>
                    {timeSlots.map(time => {
                        const slotBreaks = teamBreaks.filter(b => b.start_time === time);
                        const myBreak = slotBreaks.find(b => b.user_id === user?.id);
                        return (
                            <div key={time} className={`timeline-slot ${myBreak ? 'my-break' : slotBreaks.length > 0 ? 'taken' : ''}`} title={slotBreaks.map(b => b.full_name).join(', ')}>
                                {time.split(':')[0]}:{time.split(':')[1]}
                                {slotBreaks.length > 0 && <div style={{ fontSize: 10 }}>{slotBreaks.length}👤</div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
