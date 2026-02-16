import { useState } from 'react';
import '../pages/admin/Shifts.v3.css'; // Ensure new CSS is loaded

export default function ShiftGrid({ user, gridData, breaks = [], onCellClick, onCellHover, actions, onUserClick, onRangeSelect }) {
    const [dragStart, setDragStart] = useState(null);

    if (!gridData) return null;

    // --- Interaction Handlers ---
    const handleMouseDown = (index) => {
        setDragStart(index);
    };

    const handleMouseEnter = (index) => {
        if (onCellHover) onCellHover(user.id, index);
    };

    const handleMouseUp = (index) => {
        if (dragStart !== null) {
            const start = Math.min(dragStart, index);
            const end = Math.max(dragStart, index);

            if (start === end && onCellClick) {
                onCellClick(user.id, start);
            } else if (onRangeSelect) {
                onRangeSelect(user.id, start, end + 1);
            }
            setDragStart(null);
        }
    };

    // Calculate Blocks for Smart Labels
    const blocks = [];
    let currentBlock = null;

    gridData.forEach((cell, index) => {
        if (cell) {
            if (!currentBlock) {
                currentBlock = { status: cell.status, color: cell.color, start: index, end: index };
            } else if (cell.status === currentBlock.status && cell.color === currentBlock.color) {
                currentBlock.end = index;
            } else {
                blocks.push(currentBlock);
                currentBlock = { status: cell.status, color: cell.color, start: index, end: index };
            }
        } else {
            if (currentBlock) {
                blocks.push(currentBlock);
                currentBlock = null;
            }
        }
    });
    if (currentBlock) blocks.push(currentBlock);

    // Determine displayName and subText
    // If shift_date exists, we are in MyShifts view -> show formatted date as title, hide subtext
    // If shift_date is missing, we are in Admin view -> show name + code
    const isAgentView = !!user.shift_date;
    const displayName = isAgentView
        ? new Date(user.shift_date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
        : user.full_name;
    const subText = isAgentView ? null : user.agent_number;

    return (
        <div className="grid-user-row">
            <div className="user-info" onClick={() => onUserClick && onUserClick(user.id)} style={{ cursor: onUserClick ? 'pointer' : 'default' }}>
                <div className="name" title={user.full_name}>{displayName}</div>
                {subText && <div className="code">{subText}</div>}
            </div>

            <div className="grid-cells-container" onMouseLeave={() => setDragStart(null)}>
                {/* Render Grid Cells */}
                {Array.from({ length: 48 }).map((_, i) => {
                    const cell = gridData[i];
                    return (
                        <div
                            key={i}
                            className="grid-cell"
                            style={{
                                background: cell ? cell.color : 'transparent',
                                opacity: cell ? 0.9 : 0.5
                            }}
                            onMouseDown={() => handleMouseDown(i)}
                            onMouseEnter={() => handleMouseEnter(i)}
                            onMouseUp={() => handleMouseUp(i)}
                        />
                    );
                })}

                {/* Render Smart Labels overlays */}
                {blocks.map((block, idx) => {
                    const left = (block.start / 48) * 100;
                    const width = ((block.end - block.start + 1) / 48) * 100;
                    return (
                        <div
                            key={idx}
                            className="shift-block-label"
                            style={{ left: `${left}%`, width: `${width}%` }}
                        >
                            {block.status}
                        </div>
                    );
                })}

                {/* Render Break Overlays */}
                {breaks && breaks.map((b, i) => {
                    if (!b.start_time) return null;
                    const [h, m] = b.start_time.split(':').map(Number);
                    const totalMins = h * 60 + m;
                    const gridPos = totalMins / 30;
                    const left = (gridPos / 48) * 100;
                    let width = (1 / 48) * 100;
                    if (b.duration) {
                        width = (b.duration / (24 * 60)) * 100;
                    }

                    return (
                        <div
                            key={`break-${i}`}
                            className="break-overlay"
                            style={{ left: `${left}%`, width: `${width}%` }}
                        >
                            ☕
                        </div>
                    );
                })}
            </div>

            <div className="row-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px' }}>
                {actions}
            </div>
        </div>
    );
}
