import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './Breaks.css';

export default function Breaks() {
    const { user } = useAuth();
    const [breaks, setBreaks] = useState([]);
    const [summary, setSummary] = useState(null);
    const [teamBreaks, setTeamBreaks] = useState([]);
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedDuration, setSelectedDuration] = useState(10);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

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

    const getTimelinePos = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        const totalMinutes = (h - 11) * 60 + m;
        return (totalMinutes / 660) * 100;
    };

    const getTimelineWidth = (duration) => {
        return (duration / 660) * 100;
    };

    return (
        <div className="page breaks-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">☕ Molalarım</h1>
                    <p className="page-subtitle">Günlük mola haklarınızı yönetin</p>
                </div>
            </div>

            <div className="breaks-grid">
                <div className="break-card">
                    <h3 className="card-title">Mola Planla</h3>
                    <div style={{ marginTop: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Başlangıç Saati</label>
                            <input
                                type="time"
                                className="form-input"
                                value={selectedTime}
                                onChange={e => setSelectedTime(e.target.value)}
                                min="11:00"
                                max="22:00"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Süre Seçimi</label>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    className={`btn ${selectedDuration === 10 ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setSelectedDuration(10)}
                                    disabled={summary && summary.remaining10 <= 0}
                                    style={{ flex: 1 }}
                                >
                                    10 dk ({summary?.remaining10 || 6} hak)
                                </button>
                                <button
                                    className={`btn ${selectedDuration === 30 ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setSelectedDuration(30)}
                                    disabled={summary && summary.remaining30 <= 0}
                                    style={{ flex: 1 }}
                                >
                                    30 dk ({summary?.remaining30 || 1} hak)
                                </button>
                            </div>
                        </div>
                        <button className="btn btn-success" onClick={scheduleBreak} disabled={!selectedTime}>Mola Planla</button>
                    </div>
                    {summary && (
                        <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span>Toplam Kullanılan:</span><span>{summary.usedMinutes}/60 dk</span>
                            </div>
                            <div className="progress-bar" style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${(summary.usedMinutes / 60) * 100}%`, height: '100%', background: 'var(--success)' }}></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="break-card" style={{ flex: 1 }}>
                    <h3 className="card-title">Bugünkü Molalarım</h3>
                    <div style={{ marginTop: 16 }}>
                        {breaks.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Planlanmış mola yok.</p>}
                        {breaks.map(b => (
                            <div key={b.id} style={{ padding: 12, background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>{b.start_time} - {b.end_time || '-'}</span>
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

            <div className="break-card" style={{ marginTop: 20 }}>
                <h3 className="card-title">Takım Mola Durumu (Timeline)</h3>
                <div className="timeline-container">
                    {/* Time Axis */}
                    <div className="timeline-axis">
                        {Array.from({ length: 12 }, (_, i) => 11 + i).map(h => (
                            <div key={h} className="hour-mark">{h}:00</div>
                        ))}
                    </div>

                    {/* Current Time Line */}
                    {currentTime.getHours() >= 11 && currentTime.getHours() < 22 && (
                        <div className="current-time-line" style={{ left: `${((currentTime.getHours() - 11) * 60 + currentTime.getMinutes()) / 660 * 100}%` }}>
                            <div className="time-badge">
                                {currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    )}

                    {/* Break Tracks */}
                    <div className="timeline-track">
                        {teamBreaks.map(b => (
                            <div
                                key={b.id}
                                className={`break-block ${b.user_id === user?.id ? 'my-break' : ''}`}
                                style={{
                                    left: `${getTimelinePos(b.start_time)}%`,
                                    width: `${getTimelineWidth(b.duration_minutes)}%`,
                                    top: b.user_id !== user?.id && teamBreaks.find(ob => ob.id !== b.id && ob.start_time === b.start_time) ? '28px' : '5px' // Simple overlap handling
                                }}
                                title={`${b.full_name}: ${b.start_time} (${b.duration_minutes}dk)`}
                            >
                                {b.user_id === user?.id ? 'Ben' : b.full_name.split(' ')[0]}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
