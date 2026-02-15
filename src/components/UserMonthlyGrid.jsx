import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import '../pages/admin/Shifts.css';
import ShiftGrid from './ShiftGrid';

const GRID_SIZE = 48;

const timeToGridIndex = (timeStr) => {
    if (!timeStr) return -1;
    const [h, m] = timeStr.split(':').map(Number);
    return Math.floor((h * 60 + m) / 30);
};

export default function UserMonthlyGrid({ userId }) {
    const { user } = useAuth();
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) loadSchedule();
    }, [userId]);

    const loadSchedule = async () => {
        setLoading(true);
        try {
            const today = new Date();
            // Show current month + a bit? Or just 30 days starting today? 
            // User said "Weeks of the Month". Let's show current month (1st to last).
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            // Actually, maybe better to show -7 days to +23 days? 
            // Let's stick to 1st to last of current month for "Month View".
            const startDate = startOfMonth.toISOString().split('T')[0];
            const endDate = endOfMonth.toISOString().split('T')[0];

            // Fetch Data using new endpoints
            const [shiftsRes, breaksRes] = await Promise.all([
                api.get(`/shifts/user/${userId}/range?start=${startDate}&end=${endDate}`),
                api.get(`/breaks/user/${userId}/range?start=${startDate}&end=${endDate}`)
            ]);

            const allShifts = shiftsRes.data;
            const allBreaks = breaksRes.data.breaks;

            // Build Schedule Array for each day of month
            const days = [];
            const current = new Date(startOfMonth);
            while (current <= endOfMonth) {
                const dateStr = current.toISOString().split('T')[0];

                // Find shift for this day
                const dayShift = allShifts.find(s => s.shift_date === dateStr);
                const dayBreaks = allBreaks.filter(b => b.break_date === dateStr);

                // Build Grid Data
                const gridData = Array(GRID_SIZE).fill(null);
                if (dayShift) {
                    const startIndex = timeToGridIndex(dayShift.start_time);
                    const endIndex = timeToGridIndex(dayShift.end_time);

                    if (startIndex !== -1 && endIndex !== -1) {
                        for (let j = startIndex; j < endIndex; j++) {
                            if (j >= 0 && j < GRID_SIZE) {
                                gridData[j] = {
                                    status: dayShift.special_status || 'Mesai',
                                    color: dayShift.special_status === 'İzin' ? '#ef4444' :
                                        dayShift.special_status === 'Raporlu' ? '#f59e0b' : '#3b82f6'
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
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ color: 'white', padding: 20 }}>Yükleniyor...</div>;

    return (
        <div style={{ padding: 20 }}>
            {/* Header for Time Axis - Reused from Shifts.css structure */}
            <div className="grid-header-row" style={{ minWidth: 'auto' }}>
                <div className="header-cell agent-name" style={{ color: '#94a3b8' }}>Tarih</div>
                <div className="header-cell timeline-wrapper">
                    {Array.from({ length: 24 }).map((_, h) => (
                        <div key={h} className="hour-marker" style={{ width: `${(1 / 24) * 100}%` }}>
                            {h}
                        </div>
                    ))}
                </div>
            </div>

            {schedule.map(day => (
                <div key={day.date} className="grid-row-wrapper">
                    <ShiftGrid
                        user={{
                            full_name: day.rawDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }),
                            agent_number: '',
                            shift_date: day.date,
                            id: userId
                        }}
                        gridData={day.gridData}
                        breaks={day.breaks}
                    />
                </div>
            ))}
        </div>
    );
}
