import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './admin/Shifts.v3.css'; // V3 CSS
import ShiftGrid from '../components/ShiftGrid';

const GRID_SIZE = 48;

const timeToGridIndex = (timeStr) => {
    if (!timeStr) return -1;
    const [h, m] = timeStr.split(':').map(Number);
    return Math.floor((h * 60 + m) / 30);
};

export default function MyShifts() {
    const { user } = useAuth();
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTimePercent, setCurrentTimePercent] = useState(0);

    useEffect(() => {
        loadMyShifts();

        // Timer for Red Line
        const updateTime = () => {
            const now = new Date();
            const totalMins = now.getHours() * 60 + now.getMinutes();
            const percent = (totalMins / (24 * 60)) * 100;
            setCurrentTimePercent(percent);
        };
        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    const loadMyShifts = async () => {
        setLoading(true);
        try {
            const today = new Date();
            const start = new Date(today);
            start.setDate(today.getDate() - 1);
            const end = new Date(today);
            end.setDate(today.getDate() + 6);

            const sStr = start.toISOString().split('T')[0];
            const eStr = end.toISOString().split('T')[0];

            const [shiftsRes, breaksRes] = await Promise.all([
                api.get(`/shifts/user/${user.id}/range?start=${sStr}&end=${eStr}`),
                api.get(`/breaks/user/${user.id}/range?start=${sStr}&end=${eStr}`)
            ]);

            const allShifts = shiftsRes.data;
            const allBreaks = breaksRes.data.breaks;

            const days = [];
            const current = new Date(start);
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                const dayShift = allShifts.find(s => s.shift_date === dateStr);
                const dayBreaks = allBreaks ? allBreaks.filter(b => b.break_date === dateStr) : [];

                const gridData = Array(GRID_SIZE).fill(null);
                if (dayShift) {
                    const startIndex = timeToGridIndex(dayShift.start_time);
                    const endIndex = timeToGridIndex(dayShift.end_time);
                    const color = dayShift.special_status === 'İzin' ? '#ef4444' :
                        dayShift.special_status === 'Raporlu' ? '#f59e0b' : '#3b82f6';

                    if (startIndex !== -1 && endIndex !== -1) {
                        for (let j = startIndex; j < endIndex; j++) {
                            if (j >= 0 && j < GRID_SIZE) {
                                gridData[j] = {
                                    status: dayShift.special_status || 'Mesai',
                                    color: color
                                };
                            }
                        }
                    }
                }

                days.push({
                    date: dateStr,
                    rawDate: new Date(current),
                    gridData,
                    shift: dayShift,
                    breaks: dayBreaks
                });
                current.setDate(current.getDate() + 1);
            }
            setSchedule(days);

        } catch (err) {
            console.error("MyShifts load error", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ color: 'white', padding: 20 }}>Yükleniyor...</div>;

    return (
        <div className="page" style={{ padding: '20px', background: '#0f172a', minHeight: '100vh', color: 'white' }}>
            <h1 style={{ marginBottom: '20px', fontSize: '1.5rem', fontWeight: 'bold' }}>Vardiyalarım</h1>

            <div className="grid-container">
                <div
                    className="grid-scroll-content"
                    style={{ '--time-percent': currentTimePercent }}
                >
                    <div className="current-time-line" title="Şu An"></div>

                    <div className="grid-header-row">
                        <div className="header-cell agent-name">Tarih</div>
                        <div className="header-cell timeline-wrapper">
                            {Array.from({ length: 24 }).map((_, h) => (
                                <div key={h} className="hour-marker" style={{ width: `${(1 / 24) * 100}%` }}>
                                    {h}
                                </div>
                            ))}
                        </div>
                        <div className="header-cell actions"></div>
                    </div>

                    {schedule.map(day => (
                        <div key={day.date} className="grid-row-wrapper">
                            <ShiftGrid
                                user={{
                                    full_name: day.rawDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }),
                                    shift_date: day.date,
                                    id: user.id
                                }}
                                gridData={day.gridData}
                                breaks={day.breaks}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
