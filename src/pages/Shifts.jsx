import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Shifts() {
    const [shifts, setShifts] = useState([]);
    const [view, setView] = useState('weekly');

    useEffect(() => { loadShifts(); }, []);

    const loadShifts = async () => {
        try {
            const res = await api.get('/shifts/me');
            setShifts(res.data);
        } catch (err) { console.error(err); }
    };

    const getWeekDays = () => {
        const days = [];
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const weekDays = getWeekDays();

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📅 Vardiyalarım</h1>
                    <p className="page-subtitle">Çalışma programınızı görüntüleyin</p>
                </div>
                <div className="tabs" style={{ marginBottom: 0, border: 'none' }}>
                    {['daily', 'weekly', 'monthly'].map(v => (
                        <button key={v} className={`tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
                            {v === 'daily' ? 'Günlük' : v === 'weekly' ? 'Haftalık' : 'Aylık'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card">
                {view === 'weekly' && (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d, i) => (
                                        <th key={d} style={{ textAlign: 'center' }}>
                                            {d}<br />
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{weekDays[i].getDate()}/{weekDays[i].getMonth() + 1}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {weekDays.map(day => {
                                        const dateStr = day.toISOString().split('T')[0];
                                        const shift = shifts.find(s => s.shift_date === dateStr);
                                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                                        return (
                                            <td key={dateStr} style={{ textAlign: 'center', background: isToday ? 'rgba(99,102,241,0.1)' : 'transparent', padding: 16 }}>
                                                {shift ? (
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{shift.start_time}</div>
                                                        <div style={{ color: 'var(--text-secondary)' }}>{shift.end_time}</div>
                                                        {shift.special_status && <span className="badge badge-warning" style={{ marginTop: 4 }}>{shift.special_status}</span>}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {view === 'daily' && (
                    <div>
                        {(() => {
                            const today = new Date().toISOString().split('T')[0];
                            const todayShift = shifts.find(s => s.shift_date === today);
                            return todayShift ? (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
                                    <h2>{todayShift.start_time} - {todayShift.end_time}</h2>
                                    {todayShift.special_status && <p className="badge badge-warning" style={{ marginTop: 12 }}>{todayShift.special_status}</p>}
                                </div>
                            ) : (
                                <div className="empty-state"><p>Bugün için vardiya atanmamış</p></div>
                            );
                        })()}
                    </div>
                )}

                {view === 'monthly' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                            <div key={d} style={{ padding: 8, textAlign: 'center', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>{d}</div>
                        ))}
                        {Array.from({ length: 35 }).map((_, i) => {
                            const firstDay = new Date();
                            firstDay.setDate(1);
                            const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
                            const dayNum = i - offset + 1;
                            const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), dayNum);
                            if (date.getMonth() !== firstDay.getMonth()) return <div key={i}></div>;
                            const dateStr = date.toISOString().split('T')[0];
                            const shift = shifts.find(s => s.shift_date === dateStr);
                            const isToday = dateStr === new Date().toISOString().split('T')[0];
                            return (
                                <div key={i} style={{ padding: 8, textAlign: 'center', background: isToday ? 'rgba(99,102,241,0.2)' : 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', minHeight: 60 }}>
                                    <div style={{ fontSize: 12, marginBottom: 4 }}>{dayNum}</div>
                                    {shift && <div style={{ fontSize: 10, color: 'var(--primary-light)' }}>{shift.start_time?.slice(0, 5)}</div>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
