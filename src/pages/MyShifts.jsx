import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './admin/Shifts.css'; // Reuse admin styles for timeline

export default function MyShifts() {
    const { user } = useAuth();
    const [schedule, setSchedule] = useState([]);

    useEffect(() => { loadSchedule(); }, []);

    const loadSchedule = async () => {
        try {
            // Get all shifts
            const res = await api.get('/shifts/me');
            const allShifts = res.data;

            // Generate next 30 days
            const days = [];
            const today = new Date();

            for (let i = 0; i < 30; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];

                // Find shifts for this day
                const dayShifts = allShifts.filter(s => s.shift_date === dateStr);

                days.push({
                    date: dateStr,
                    displayDate: d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }),
                    shifts: dayShifts
                });
            }
            setSchedule(days);
        } catch (err) { console.error(err); }
    };

    const getTimelinePos = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        const totalMinutes = (h - 11) * 60 + m;
        return (totalMinutes / 660) * 100;
    };

    return (
        <div className="page admin-shifts"> {/* Reuse class for styles */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">📅 Vardiyalarım</h1>
                    <p className="page-subtitle">Önümüzdeki 30 günün çalışma programı</p>
                </div>
            </div>

            <div className="shifts-grid card">
                <div className="grid-header">
                    <div className="agent-col">Tarih</div>
                    <div className="timeline-axis">
                        {Array.from({ length: 12 }, (_, i) => 11 + i).map(h => (
                            <div key={h} className="hour-mark">{h}:00</div>
                        ))}
                    </div>
                </div>

                <div className="grid-body">
                    {schedule.map(day => (
                        <div key={day.date} className="grid-row">
                            <div className="agent-cell">
                                <span style={{ fontWeight: 500 }}>{day.displayDate}</span>
                            </div>
                            <div className="timeline-cell">
                                {day.shifts.length === 0 ? (
                                    <div style={{
                                        position: 'absolute',
                                        left: 0, right: 0, top: 0, bottom: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic'
                                    }}>
                                        İzinli / Boş
                                    </div>
                                ) : (
                                    day.shifts.map(shift => (
                                        <div
                                            key={shift.id}
                                            className="shift-bar"
                                            style={{
                                                left: `${getTimelinePos(shift.start_time)}%`,
                                                width: `${getTimelinePos(shift.end_time) - getTimelinePos(shift.start_time)}%`,
                                                backgroundColor: shift.special_status === 'İzin' ? '#ef4444' : shift.special_status === 'Raporlu' ? '#ef4444' : '#6366f1'
                                            }}
                                            title={`${shift.start_time} - ${shift.end_time}`}
                                        >
                                            <span className="time-text">{shift.special_status || `${shift.start_time} - ${shift.end_time}`}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
