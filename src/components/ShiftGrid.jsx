import React from 'react';
import '../pages/admin/Shifts.css'; // Ensure CSS is loaded

// Helper Functions
const indexToTimeStr = (index) => {
    const totalMins = index * 30;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const renderBriefBreak = (userId, index, breaks) => {
    const slotStartMins = index * 30;
    const slotEndMins = (index + 1) * 30;

    const userBreaks = breaks ? breaks.filter(b => b.user_id === userId) : [];

    return userBreaks.map(b => {
        const [bh, bm] = b.start_time.split(':').map(Number);
        const breakStartMins = bh * 60 + bm;
        const breakEndMins = breakStartMins + b.duration_minutes;

        // Intersection check
        const startLink = Math.max(slotStartMins, breakStartMins);
        const endLink = Math.min(slotEndMins, breakEndMins);

        if (startLink < endLink) {
            const leftP = ((startLink - slotStartMins) / 30) * 100;
            const widthP = ((endLink - startLink) / 30) * 100;

            return (
                <div key={b.id} className="grid-break-overlay" style={{
                    left: `${leftP}%`,
                    width: `${widthP}%`,
                }} title={`Mola: ${b.start_time} (${b.duration_minutes}dk)`}></div>
            );
        }
        return null;
    });
};

export default function ShiftGrid({ user, gridData, breaks = [], onCellClick, onCellHover, actions, onUserClick }) {
    if (!gridData) return null;

    return (
        <div className="grid-user-row">
            <div className="user-info" onClick={() => onUserClick && onUserClick(user.id)} style={{ cursor: onUserClick ? 'pointer' : 'default' }}>
                <div className="name">{user.shift_date ? new Date(user.shift_date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }) : user.full_name}</div>
                <div className="code">{user.shift_date ? 'Günlük Görünüm' : user.agent_number}</div>
            </div>

            <div className="grid-slots">
                {Array.from({ length: 48 }).map((_, index) => {
                    const cellData = gridData[index];
                    return (
                        <div
                            key={index}
                            className="grid-slot"
                            style={{
                                backgroundColor: cellData ? cellData.color : 'transparent',
                                opacity: cellData ? 1 : 0.05
                            }}
                            onClick={() => onCellClick && onCellClick(user.id, index)}
                            onMouseEnter={() => onCellHover && onCellHover(user.id, index)}
                            onMouseLeave={() => onCellHover && onCellHover(null)}
                            title={`${indexToTimeStr(index)} - ${indexToTimeStr(index + 1)}${cellData ? ` (${cellData.status})` : ''}`}
                        >
                            {renderBriefBreak(user.id, index, breaks)}
                        </div>
                    );
                })}
            </div>

            <div className="row-actions">
                {actions}
            </div>
        </div>
    );
}
