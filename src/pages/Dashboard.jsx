import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './Dashboard.css';

export default function Dashboard() {
    const { user } = useAuth();
    const [session, setSession] = useState(null);
    const [activeBreak, setActiveBreak] = useState(null);
    const [timer, setTimer] = useState(0);
    const [breakTimer, setBreakTimer] = useState(0);
    const [stats, setStats] = useState(null);
    const [todayShift, setTodayShift] = useState(null);
    const [tomorrowShift, setTomorrowShift] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [newSuggestion, setNewSuggestion] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        let interval;
        if (session?.status === 'active') {
            interval = setInterval(() => setTimer(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [session?.status]);

    useEffect(() => {
        let interval;
        if (activeBreak) {
            const remaining = activeBreak.duration_minutes * 60;
            setBreakTimer(remaining);
            interval = setInterval(() => {
                setBreakTimer(t => t > 0 ? t - 1 : 0);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeBreak]);

    const loadData = async () => {
        try {
            const [sessionRes, shiftsRes, suggestionsRes] = await Promise.all([
                api.get('/sessions/current'),
                api.get('/shifts/me'),
                api.get('/suggestions')
            ]);
            setSession(sessionRes.data.session);
            setActiveBreak(sessionRes.data.activeBreak);
            if (sessionRes.data.session?.total_worked_seconds) {
                setTimer(sessionRes.data.session.total_worked_seconds);
            }

            const today = new Date().toISOString().split('T')[0];
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            setTodayShift(shiftsRes.data.find(s => s.shift_date === today));
            setTomorrowShift(shiftsRes.data.find(s => s.shift_date === tomorrow));
            setSuggestions(suggestionsRes.data.slice(0, 5));
        } catch (err) {
            console.error(err);
        }
    };

    const startShift = async () => {
        await api.post('/sessions/start');
        loadData();
    };
    const pauseShift = async () => {
        await api.post('/sessions/pause');
        loadData();
    };
    const resumeShift = async () => {
        await api.post('/sessions/resume');
        loadData();
    };
    const endShift = async () => {
        await api.post('/sessions/end');
        loadData();
    };

    const submitSuggestion = async (e) => {
        e.preventDefault();
        if (!newSuggestion.trim()) return;
        await api.post('/suggestions', { content: newSuggestion });
        setNewSuggestion('');
        loadData();
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="page dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Hoş geldin, {user?.full_name?.split(' ')[0]} 👋</h1>
                    <p className="page-subtitle">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
            </div>

            <div className="grid grid-2">
                <div className="card shift-card">
                    <div className="card-header">
                        <h3 className="card-title">Mesai Durumu</h3>
                        <span className={`status-dot ${session?.status === 'active' ? 'status-active' : session?.status === 'paused' ? 'status-paused' : 'status-idle'}`}></span>
                    </div>

                    <div className="timer-display">
                        <div className="timer">{formatTime(timer)}</div>
                        <div className="timer-label">{session?.status === 'active' ? 'Aktif Mesai' : session?.status === 'paused' ? 'Duraklatıldı' : 'Henüz başlamadı'}</div>
                    </div>

                    {activeBreak && (
                        <div className="break-indicator">
                            <span className="status-dot status-paused"></span>
                            Molada - {formatTime(breakTimer)} kaldı
                        </div>
                    )}

                    <div className="shift-controls">
                        {(!session || session.status === 'idle') && (
                            <button className="btn btn-success" onClick={startShift}>▶️ Vardiya Başlat</button>
                        )}
                        {session?.status === 'active' && (
                            <>
                                <button className="btn btn-warning" onClick={pauseShift}>⏸️ Duraklat</button>
                                <button className="btn btn-danger" onClick={endShift}>⏹️ Bitir</button>
                            </>
                        )}
                        {session?.status === 'paused' && !activeBreak && (
                            <>
                                <button className="btn btn-success" onClick={resumeShift}>▶️ Devam Et</button>
                                <button className="btn btn-danger" onClick={endShift}>⏹️ Bitir</button>
                            </>
                        )}
                    </div>
                </div>

                <div className="card stats-card">
                    <div className="card-header">
                        <h3 className="card-title">Bu Hafta</h3>
                    </div>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <div className="stat-value">{todayShift ? `${todayShift.start_time} - ${todayShift.end_time}` : '—'}</div>
                            <div className="stat-label">Bugün</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{tomorrowShift ? `${tomorrowShift.start_time} - ${tomorrowShift.end_time}` : '—'}</div>
                            <div className="stat-label">Yarın</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card suggestions-card">
                <div className="card-header">
                    <h3 className="card-title">💡 Öneriler</h3>
                </div>
                <form className="suggestion-form" onSubmit={submitSuggestion}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Program hakkında önerinizi yazın..."
                        value={newSuggestion}
                        onChange={(e) => setNewSuggestion(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">Gönder</button>
                </form>
                <div className="suggestions-list">
                    {suggestions.map(s => (
                        <div key={s.id} className="suggestion-item">
                            <span className="suggestion-author">{s.full_name}</span>
                            <p className="suggestion-content">{s.content}</p>
                        </div>
                    ))}
                    {suggestions.length === 0 && <p className="text-muted">Henüz öneri yok.</p>}
                </div>
            </div>
        </div>
    );
}
