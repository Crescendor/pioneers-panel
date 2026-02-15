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
        // Optional: We could emit hover events here for drag preview
        if (onCellHover) onCellHover(user.id, index);
    };

    const handleMouseUp = (index) => {
        if (dragStart !== null) {
            // Determine range (min to max) to allow backward drag
            const start = Math.min(dragStart, index);
            const end = Math.max(dragStart, index);

            // If it's a single click (start === end), fallback to onCellClick
            // If it's a drag (start !== end), use onRangeSelect
            if (start === end && onCellClick) {
                onCellClick(user.id, start);
            } else if (onRangeSelect) {
                onRangeSelect(user.id, start, end + 1); // +1 because logic usually expects exclusive end
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
                // Start new block
                currentBlock = { status: cell.status, color: cell.color, start: index, end: index };
            } else if (cell.status === currentBlock.status && cell.color === currentBlock.color) {
                // Continue block
                currentBlock.end = index;
            } else {
                // End previous, start new
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

    return (
        <div className="grid-user-row">
            <div className="user-info" onClick={() => onUserClick && onUserClick(user.id)} style={{ cursor: onUserClick ? 'pointer' : 'default' }}>
                <div className="name" title={user.full_name}>{user.shift_date ? new Date(user.shift_date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }) : user.full_name}</div>
                <div className="code">{user.shift_date ? 'Günlük Görünüm' : user.agent_number}</div>
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
                    // Convert break start time (HH:MM) to percentage
                    if (!b.start_time) return null;
                    const [h, m] = b.start_time.split(':').map(Number);
                    const totalMins = h * 60 + m;
                    const gridPos = totalMins / 30;
                    const left = (gridPos / 48) * 100;

                    // Duration is usually 30 min (1 slot) or 15
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
