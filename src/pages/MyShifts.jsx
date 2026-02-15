import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './admin/Shifts.css'; // Reuse admin styles for grid layout
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
    const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'

    useEffect(() => { loadSchedule(); }, [viewMode]);

    const loadSchedule = async () => {
        try {
            const today = new Date();
            const daysCount = viewMode === 'weekly' ? 7 : 30;

            const startDate = today.toISOString().split('T')[0];
            const endDateObj = new Date(today);
            endDateObj.setDate(today.getDate() + daysCount);
            const endDate = endDateObj.toISOString().split('T')[0];

            // Fetch Data
            const [shiftsRes, breaksRes] = await Promise.all([
                api.get('/shifts/me'),
                api.get(`/breaks/me/range?start=${startDate}&end=${endDate}`)
            ]);

            const allShifts = shiftsRes.data;
            const allBreaks = breaksRes.data.breaks;

            // Build Schedule Array
            const days = [];
            for (let i = 0; i < daysCount; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];

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
                    rawDate: d,
                    gridData,
                    shift: dayShift,
                    breaks: dayBreaks
                });
            }
            setSchedule(days);
        } catch (err) { console.error(err); }
    };

    return (
        <div className="page admin-shifts-reset">
            <div className="reset-controls">
                <div className="control-row">
                    <h1 className="page-title">📅 Vardiyalarım</h1>
                    <div className="actions">
                        <button className={`btn ${viewMode === 'weekly' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('weekly')}>Haftalık</button>
                        <button className={`btn ${viewMode === 'monthly' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('monthly')}>Aylık</button>
                    </div>
                </div>
            </div>

            <div className="grid-container">
                {/* Header Row */}
                <div className="grid-header-row">
                    <div className="header-cell agent-name">Tarih</div>
                    <div className="header-cell timeline-wrapper">
                        {Array.from({ length: 24 }).map((_, h) => (
                            <div key={h} className="hour-marker" style={{ width: `${(1 / 24) * 100}%` }}>
                                {h}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Days Rows */}
                {schedule.map(day => (
                    <div key={day.date} className="grid-row-wrapper">
                        <ShiftGrid
                            user={{
                                full_name: day.rawDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }),
                                agent_number: '',
                                shift_date: day.date, // Special prop to trigger "Daily View" mode in component
                                id: user.id
                            }}
                            gridData={day.gridData}
                            breaks={day.breaks}
                        // No interaction handlers for read-only view
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
