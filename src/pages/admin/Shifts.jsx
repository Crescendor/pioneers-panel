import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './Shifts.css';
import ShiftGrid from '../../components/ShiftGrid';
import UserMonthlyGrid from '../../components/UserMonthlyGrid';

// --- CONSTANTS & HELPERS ---
const GRID_SIZE = 48; // 24 hours * 2 (30 min slots)

const timeToGridIndex = (timeStr) => {
    if (!timeStr) return -1;
    const [h, m] = timeStr.split(':').map(Number);
    return Math.floor((h * 60 + m) / 30);
};

const indexToTimeStr = (index) => {
    const totalMins = index * 30;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const SHIFT_TEMPLATES = [
    { label: '11-20', label_short: 'A', start: '11:00', end: '20:00', color: '#3b82f6', type: 'template' },
    { label: '13-22', label_short: 'B', start: '13:00', end: '22:00', color: '#8b5cf6', type: 'template' },
    { label: '09-18', label_short: 'C', start: '09:00', end: '18:00', color: '#10b981', type: 'template' }
];

const STATUS_TOOLS = [
    { label: 'İzin', value: 'İzin', color: '#ef4444', type: 'status' },
    { label: 'Rapor', value: 'Raporlu', color: '#f59e0b', type: 'status' },
    { label: 'Sil', value: null, color: '#334155', type: 'eraser' }
];

export default function AdminShifts() {
    const { user } = useAuth();

    // --- STATE ---
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Grid State: { [userId]: Array(48).fill(null | { status, color, id? }) }
    const [gridState, setGridState] = useState({});
    const [breaks, setBreaks] = useState([]);

    // UI State
    const [activeTool, setActiveTool] = useState(SHIFT_TEMPLATES[0]); // Default tool
    const [customStatus, setCustomStatus] = useState({ label: 'Özel', color: '#ec4899' });
    const [copiedGrid, setCopiedGrid] = useState(null);
    const [hoveredCell, setHoveredCell] = useState(null); // { userId, index }

    // User Detail View (Monthly/Weekly)
    const [detailUser, setDetailUser] = useState(null);

    useEffect(() => { loadTeams(); }, []);
    useEffect(() => { if (selectedTeam) loadData(); }, [selectedTeam, selectedDate]);

    // --- DATA LOADING ---
    const loadTeams = async () => {
        const res = await api.get('/teams');
        setTeams(res.data);
        if (user?.role === 'TeamLead') setSelectedTeam(user.team_id);
    };

    const loadData = async () => {
        try {
            const [usersRes, shiftsRes, breaksRes] = await Promise.all([
                api.get(`/users/team/${selectedTeam}`),
                api.get(`/shifts/team/${selectedTeam}`),
                api.get(`/breaks/team/${selectedTeam}/date/${selectedDate}`)
            ]);

            setUsers(usersRes.data);
            setBreaks(breaksRes.data.breaks);

            // Initialize Grid State
            const newGridState = {};
            usersRes.data.forEach(u => {
                newGridState[u.id] = Array(GRID_SIZE).fill(null);
            });

            // Populate Grid with Shifts
            const daysShifts = shiftsRes.data.filter(s => s.shift_date === selectedDate);
            daysShifts.forEach(s => {
                const startIndex = timeToGridIndex(s.start_time);
                const endIndex = timeToGridIndex(s.end_time);
                const color = getShiftColor(s.special_status);

                if (startIndex !== -1 && endIndex !== -1) {
                    for (let i = startIndex; i < endIndex; i++) {
                        if (i >= 0 && i < GRID_SIZE && newGridState[s.user_id]) {
                            newGridState[s.user_id][i] = {
                                status: s.special_status || 'Mesai',
                                color: color,
                                shiftId: s.id
                            };
                        }
                    }
                }
            });

            setGridState(newGridState);
        } catch (err) {
            console.error("Data load error:", err);
        }
    };

    const getShiftColor = (status) => {
        if (!status || status === 'Mesai') return '#3b82f6';
        if (status === 'İzin') return '#ef4444';
        if (status === 'Raporlu') return '#f59e0b';
        // Check custom tools logic or return default
        return '#6366f1';
    };

    // --- INTERACTION LOGIC ---

    // Paint a single cell or range
    const paintGrid = (userId, startIndex, endIndex = startIndex + 1) => {
        setGridState(prev => {
            const newRow = [...prev[userId]];

            for (let i = startIndex; i < endIndex; i++) {
                if (i >= GRID_SIZE) continue;

                if (activeTool.type === 'eraser') {
                    newRow[i] = null;
                } else if (activeTool.type === 'template') {
                    newRow[i] = {
                        status: 'Mesai',
                        color: activeTool.color
                    };
                } else if (activeTool.type === 'status') {
                    newRow[i] = {
                        status: activeTool.value,
                        color: activeTool.color
                    };
                } else if (activeTool.type === 'custom') {
                    newRow[i] = {
                        status: customStatus.label,
                        color: customStatus.color
                    };
                }
            }

            return { ...prev, [userId]: newRow };
        });
    };

    const handleCellClick = (userId, index) => {
        if (activeTool.type === 'template') {
            const start = timeToGridIndex(activeTool.start);
            const end = timeToGridIndex(activeTool.end);
            paintGrid(userId, start, end);
        } else {
            paintGrid(userId, index);
        }
    };

    const handleRowClick = (userId) => {
        const user = users.find(u => u.id === userId);
        setDetailUser(user);
    };

    // --- SAVING ---
    const saveChanges = async () => {
        // Convert grid back to shifts
        const shiftsToSave = [];

        Object.entries(gridState).forEach(([userId, grid]) => {
            let currentBlock = null;

            grid.forEach((cell, index) => {
                const time = indexToTimeStr(index);

                if (cell) {
                    if (!currentBlock) {
                        // Start new block
                        currentBlock = {
                            user_id: parseInt(userId),
                            start_index: index,
                            start_time: time,
                            status: cell.status,
                            color: cell.color
                        };
                    } else if (cell.status !== currentBlock.status) {
                        // End current, start new
                        currentBlock.end_time = time;
                        shiftsToSave.push(currentBlock);

                        currentBlock = {
                            user_id: parseInt(userId),
                            start_index: index,
                            start_time: time,
                            status: cell.status,
                            color: cell.color
                        };
                    }
                } else {
                    if (currentBlock) {
                        // End block
                        currentBlock.end_time = time;
                        shiftsToSave.push(currentBlock);
                        currentBlock = null;
                    }
                }
            });

            if (currentBlock) {
                currentBlock.end_time = '24:00';
                shiftsToSave.push(currentBlock);
            }
        });

        try {
            await api.delete(`/shifts/team/${selectedTeam}/date/${selectedDate}`);

            const apiShifts = shiftsToSave.map(s => ({
                user_id: s.user_id,
                shift_date: selectedDate,
                start_time: s.start_time,
                end_time: s.end_time,
                special_status: s.status
            }));

            if (apiShifts.length > 0) {
                await api.post('/shifts/bulk', { shifts: apiShifts });
            }
            alert('Kaydedildi!');
            loadData();
        } catch (err) {
            console.error(err);
            alert('Kaydetme hatası');
        }
    };

    const copyGrid = (userId) => {
        setCopiedGrid([...gridState[userId]]);
        alert('Kopyalandı!');
    };

    const pasteGrid = (userId) => {
        if (!copiedGrid) return;
        setGridState(prev => ({
            ...prev,
            [userId]: [...copiedGrid]
        }));
    };

    return (
        <div className="page admin-shifts-reset">
            <div className="reset-controls">
                <div className="control-row">
                    <h1 className="page-title">Vardiya Düzenleyici (Grid)</h1>
                    <div className="actions">
                        <button className="btn btn-primary" onClick={saveChanges}>💾 Kaydet</button>
                    </div>
                </div>

                <div className="control-row secondary">
                    <select className="form-select" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
                        <option value="">Takım Seç...</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <input type="date" className="form-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                </div>

                <div className="toolbar">
                    <span className="tool-label">Araçlar:</span>
                    {SHIFT_TEMPLATES.map(t => (
                        <button
                            key={t.label}
                            className={`tool-btn ${activeTool === t ? 'active' : ''}`}
                            style={{ '--color': t.color }}
                            onClick={() => setActiveTool(t)}
                        >
                            {t.label}
                        </button>
                    ))}
                    <div className="divider"></div>
                    {STATUS_TOOLS.map(t => (
                        <button
                            key={t.label}
                            className={`tool-btn ${activeTool === t ? 'active' : ''}`}
                            style={{ '--color': t.color }}
                            onClick={() => setActiveTool(t)}
                        >
                            {t.label}
                        </button>
                    ))}
                    <div className="divider"></div>
                    <div className="custom-tool">
                        <input type="text" value={customStatus.label} onChange={e => setCustomStatus({ ...customStatus, label: e.target.value })} className="mini-input" />
                        <input type="color" value={customStatus.color} onChange={e => setCustomStatus({ ...customStatus, color: e.target.value })} className="mini-color" />
                        <button
                            className={`tool-btn ${activeTool.type === 'custom' ? 'active' : ''}`}
                            style={{ '--color': customStatus.color }}
                            onClick={() => setActiveTool({ type: 'custom', ...customStatus })}
                        >
                            Seç
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid-container">
                {/* Header Row */}
                <div className="grid-header-row">
                    <div className="header-cell agent-name">Agent</div>
                    <div className="header-cell timeline-wrapper">
                        {Array.from({ length: 24 }).map((_, h) => (
                            <div key={h} className="hour-marker" style={{ width: `${(1 / 24) * 100}%` }}>
                                {h}
                            </div>
                        ))}
                    </div>
                    <div className="header-cell actions">İşlem</div>
                </div>

                {/* Users Rows */}
                {users.map(user => (
                    <div key={user.id} className="grid-row-wrapper">
                        <ShiftGrid
                            user={user}
                            gridData={gridState[user.id]}
                            breaks={breaks.filter(b => b.user_id === user.id)}
                            onCellClick={handleCellClick}
                            onCellHover={(uid, idx) => {
                                if (uid && idx !== null) setHoveredCell({ userId: uid, index: idx });
                                else setHoveredCell(null);
                            }}
                            onUserClick={handleRowClick}
                            actions={
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); copyGrid(user.id); }} title="Kopyala">📋</button>
                                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); pasteGrid(user.id); }} title="Yapıştır">📝</button>
                                </div>
                            }
                        />
                    </div>
                ))}
            </div>

            {/* User Detail Modal */}
            {detailUser && (
                <div className="modal-overlay" onClick={() => setDetailUser(null)}>
                    <div className="modal" style={{ maxWidth: '95vw', width: '1200px', height: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{detailUser.full_name} - Aylık Program</h3>
                            <button className="btn-icon" onClick={() => setDetailUser(null)}>❌</button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, overflow: 'auto', background: '#0f172a' }}>
                            <UserMonthlyGrid userId={detailUser.id} />
                        </div>
                    </div>
                </div>
            )}

            {/* Hover Tooltip Overlay */}
            {hoveredCell && (
                <div className="floating-tooltip" style={{
                    position: 'fixed',
                    bottom: 20,
                    right: 20,
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: 4,
                    zIndex: 200, // Higher than modal
                    pointerEvents: 'none'
                }}>
                    {indexToTimeStr(hoveredCell.index)} - {indexToTimeStr(hoveredCell.index + 1)}
                </div>
            )}
        </div>
    );
}
