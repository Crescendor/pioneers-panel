import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './Shifts.css';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function AdminShifts() {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [shifts, setShifts] = useState([]); // Displayed shifts
    const [allShifts, setAllShifts] = useState([]); // All fetched shifts
    const [selectedTeam, setSelectedTeam] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingShift, setEditingShift] = useState(null);
    const [loading, setLoading] = useState(false);
    const [draggedTemplate, setDraggedTemplate] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // User Schedule Modal (Advanced)
    const [selectedAgents, setSelectedAgents] = useState([]); // Array of user IDs
    const [showFlexibleModal, setShowFlexibleModal] = useState(false); // Kept for bulk actions
    const [advancedModalOpen, setAdvancedModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [flexibleShift, setFlexibleShift] = useState({
        start: '12:00',
        end: '13:00',
        label: '',
        color: '#22c55e',
        status: ''
    });

    // Report Modal
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportConfig, setReportConfig] = useState({ type: 'daily', start: '', end: '' });

    const shiftTemplates = [
        { label: 'Sabah', start: '11:00', end: '20:00', color: '#6366f1' },
        { label: 'Akşam', start: '13:00', end: '22:00', color: '#8b5cf6' }
    ];

    useEffect(() => { loadTeams(); }, []);
    useEffect(() => { if (selectedTeam) loadData(); }, [selectedTeam, selectedDate]);

    // Timer for red line
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const loadTeams = async () => {
        const res = await api.get('/teams');
        setTeams(res.data);
        if (user?.role === 'TeamLead') setSelectedTeam(user.team_id);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, shiftsRes] = await Promise.all([
                api.get(`/users/team/${selectedTeam}`),
                api.get(`/shifts/team/${selectedTeam}`)
            ]);
            setUsers(usersRes.data);
            setAllShifts(shiftsRes.data);
            // Filter shifts for the selected date
            setShifts(shiftsRes.data.filter(s => s.shift_date === selectedDate));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (template) => {
        setDraggedTemplate(template);
    };

    const handleDrop = async (userId) => {
        if (!draggedTemplate) return;
        try {
            const shiftData = {
                user_id: userId,
                shift_date: selectedDate,
                start_time: draggedTemplate.start,
                end_time: draggedTemplate.end,
                special_status: draggedTemplate.label // Use label as status/title
            };
            await api.post('/shifts', shiftData);
            loadData();
        } catch (err) {
            alert('Vardiya atanamadı');
        } finally {
            setDraggedTemplate(null);
        }
    };

    const handleFlexibleCreate = async () => {
        if (selectedAgents.length === 0) return alert('Lütfen en az bir agent seçin.');
        if (!flexibleShift.start || !flexibleShift.end) return alert('Saat aralığı girin.');

        const shiftsToCreate = selectedAgents.map(userId => ({
            user_id: userId,
            shift_date: selectedDate,
            start_time: flexibleShift.start,
            end_time: flexibleShift.end,
            special_status: flexibleShift.label || 'Mesai' // Store label in special_status
        }));

        try {
            await api.post('/shifts/bulk', { shifts: shiftsToCreate });
            setShowFlexibleModal(false);
            setSelectedAgents([]); // Clear selection
            loadData();
        } catch (err) {
            alert('Atama başarısız oldu.');
        }
    };

    const toggleAgentSelection = (userId) => {
        setSelectedAgents(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const selectAll = () => {
        if (selectedAgents.length === users.length) setSelectedAgents([]);
        else setSelectedAgents(users.map(u => u.id));
    };

    const handleGenerateReport = () => {
        const doc = new jsPDF();
        let title = 'Vardiya Raporu';
        let filteredShifts = [...allShifts];

        if (reportConfig.type === 'daily') {
            title += ` - ${selectedDate}`;
            filteredShifts = filteredShifts.filter(s => s.shift_date === selectedDate);
        } else if (reportConfig.type === 'range') {
            if (!reportConfig.start || !reportConfig.end) return alert('Tarih aralığı seçin');
            title += ` (${reportConfig.start} - ${reportConfig.end})`;
            filteredShifts = filteredShifts.filter(s => s.shift_date >= reportConfig.start && s.shift_date <= reportConfig.end);
        }

        doc.text(title, 14, 15);

        // Group by User then Date
        const data = [];
        // Sort by Date then User
        filteredShifts.sort((a, b) => a.shift_date.localeCompare(b.shift_date) || a.user_id - b.user_id);

        filteredShifts.forEach(s => {
            const user = users.find(u => u.id === s.user_id);
            if (user) {
                data.push([
                    s.shift_date,
                    user.full_name,
                    `NOT_IZM_${user.agent_number}`,
                    `${s.start_time} - ${s.end_time}`,
                    s.special_status || 'Mesai'
                ]);
            }
        });

        if (data.length === 0) {
            alert('Seçilen kriterlere uygun veri bulunamadı.');
            return;
        }

        doc.autoTable({
            startY: 20,
            head: [['Tarih', 'İsim', 'Sicil No', 'Saatler', 'Durum']],
            body: data,
        });

        doc.save(`vardiya_raporu_${new Date().getTime()}.pdf`);
        setShowReportModal(false);
    };

    const getTimelinePos = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        const totalMinutes = (h - 11) * 60 + m;
        // Total range is 11:00 to 22:00 = 11 hours = 660 minutes.
        return (totalMinutes / 660) * 100;
    };

    const handleAgentBulkAction = async () => {
        if (!agentDateRange.start || !agentDateRange.end) return alert('Tarih aralığı seçin');

        const start = new Date(agentDateRange.start);
        const end = new Date(agentDateRange.end);
        const shiftsToCreate = [];

        // Loop through dates
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            shiftsToCreate.push({
                user_id: selectedAgent.id,
                shift_date: d.toISOString().split('T')[0],
                start_time: '00:00', // System handles this as special status if needed, or 00:00 for off
                end_time: '00:00',
                special_status: agentDateRange.status
            });
        }

        try {
            await api.post('/shifts/bulk', { shifts: shiftsToCreate });
            setSelectedAgent(null);
            loadData();
        } catch (err) {
            alert('İşlem başarısız');
        }
    };

    return (
        <div className="page admin-shifts">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📅 Vardiya Yönetimi</h1>
                    <p className="page-subtitle">Timeline üzerinde esnek planlama</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={() => setShowReportModal(true)}>📄 PDF İndir</button>
                    {selectedAgents.length > 0 && (
                        <button className="btn btn-success" onClick={() => setShowFlexibleModal(true)}>
                            ✨ Seçilenlere Ekle ({selectedAgents.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="shifts-controls card">
                <div className="control-group">
                    <label>Takım</label>
                    <select className="form-select" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} disabled={user.role === 'TeamLead'}>
                        <option value="">Takım Seçin...</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div className="control-group">
                    <label>Tarih</label>
                    <input type="date" className="form-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                </div>
                <div className="templates-pool">
                    {shiftTemplates.map(template => (
                        <div
                            key={template.label}
                            className="shift-template"
                            draggable
                            onDragStart={() => handleDragStart(template)}
                            style={{ backgroundColor: template.color }}
                        >
                            {template.label} ({template.start}-{template.end})
                        </div>
                    ))}
                </div>
            </div>

            <div className="shifts-grid card">
                <div className="grid-header">
                    <div className="agent-col" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                            type="checkbox"
                            checked={users.length > 0 && selectedAgents.length === users.length}
                            onChange={selectAll}
                            style={{ width: 16, height: 16 }}
                        />
                        Agent
                    </div>
                    <div className="timeline-axis">
                        {Array.from({ length: 12 }, (_, i) => 11 + i).map(h => (
                            <div key={h} className="hour-mark">{h}:00</div>
                        ))}
                    </div>
                </div>

                <div className="grid-body">
                    {/* Current Time Indicator logic moved inside render to be relative to timeline-cell if possible, 
                        BUT since timeline is split per row, we need a global indicator OR indicators per row.
                        Best approach: An absolute line over the whole grid body? No, body scroll.
                        Better: Render it inside every timeline cell? Expensive but easy alignment.
                        Best: Render it once in an absolute overlay over the grid body IF body was relative.
                        Decision: Render inside every timeline cell for perfect sync with scroll.
                    */}
                    {users.map(u => {
                        return (
                            <div
                                key={u.id}
                                className="grid-row"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDrop(u.id)}
                            >
                                <div className="agent-cell">
                                    <div className="agent-mini-info" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedAgents.includes(u.id)}
                                            onChange={() => toggleAgentSelection(u.id)}
                                            style={{ width: 16, height: 16 }}
                                        />
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div
                                                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                    onClick={() => {
                                                        // New Advanced Modal Trigger
                                                        setEditingUser(u);
                                                        setAdvancedModalOpen(true);
                                                    }}
                                                >
                                                    <div className="name" style={{ cursor: 'pointer', textDecoration: 'underline' }}>{u.full_name}</div>
                                                    <div className="id">NOT_IZM_{u.agent_number}</div>
                                                </div>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    style={{ padding: '4px 8px', fontSize: '12px', marginLeft: 5 }}
                                                    onClick={() => {
                                                        const doc = new jsPDF();
                                                        doc.text(`Vardiya Belgesi - ${u.full_name}`, 14, 15);
                                                        // ... PDF logic ...
                                                        doc.save(`vardiya_${u.agent_number}_${selectedDate}.pdf`);
                                                    }}
                                                >📄</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="timeline-cell" onClick={() => {
                                    setEditingUser(u);
                                    setAdvancedModalOpen(true);
                                }}>
                                    {/* Current Time Line */}
                                    {currentTime.getHours() >= 11 && currentTime.getHours() < 22 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0, bottom: 0, width: 2, background: 'red', zIndex: 15, pointerEvents: 'none',
                                            left: `${((currentTime.getHours() - 11) * 60 + currentTime.getMinutes()) / 660 * 100}%`
                                        }}>
                                            <div style={{
                                                position: 'absolute', top: -15, left: -15, background: 'red', color: 'white',
                                                fontSize: '10px', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap'
                                            }}>
                                                {currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    )}

                                    {shifts.filter(s => s.user_id === u.id).map(shift => (
                                        <div
                                            key={shift.id}
                                            className="shift-bar"
                                            style={{
                                                left: `${getTimelinePos(shift.start_time)}%`,
                                                width: `${getTimelinePos(shift.end_time) - getTimelinePos(shift.start_time)}%`,
                                                backgroundColor: shift.special_status === 'İzin' ? '#ef4444' : shift.special_status === 'Raporlu' ? '#ef4444' : '#6366f1' // Default blue
                                            }}
                                            onClick={(e) => { e.stopPropagation(); setEditingShift(shift); }}
                                            title={`${shift.start_time} - ${shift.end_time} (${shift.special_status || 'Mesai'})`}
                                        >
                                            <span className="time-text">{shift.special_status || `${shift.start_time} - ${shift.end_time}`}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {editingShift && (
                <div className="modal-overlay" onClick={() => setEditingShift(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Vardiyayı Düzenle</h3>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Başlangıç</label>
                                <input type="time" className="form-input" value={editingShift.start_time} onChange={(e) => setEditingShift({ ...editingShift, start_time: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bitiş</label>
                                <input type="time" className="form-input" value={editingShift.end_time} onChange={(e) => setEditingShift({ ...editingShift, end_time: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-danger" onClick={async () => {
                                await api.delete(`/shifts/${editingShift.id}`);
                                setEditingShift(null);
                                loadData();
                            }}>Sil</button>
                            <button className="btn btn-primary" onClick={async () => {
                                await api.put(`/shifts/${editingShift.id}`, editingShift);
                                setEditingShift(null);
                                loadData();
                            }}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {showFlexibleModal && (
                <div className="modal-overlay" onClick={() => setShowFlexibleModal(false)}>
                    {/* ... Existing Bulk Modal ... */}
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Toplu Vardiya Ekle</h3>
                            <div className="text-muted small">{selectedAgents.length} kişi seçili</div>
                            <button className="modal-close" onClick={() => setShowFlexibleModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Reusing existing logic for bulk */}
                            <div className="form-group">
                                <label className="form-label">Başlangıç</label>
                                <input type="time" className="form-input" value={flexibleShift.start} onChange={e => setFlexibleShift({ ...flexibleShift, start: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bitiş</label>
                                <input type="time" className="form-input" value={flexibleShift.end} onChange={e => setFlexibleShift({ ...flexibleShift, end: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Etiket / Durum</label>
                                <input type="text" className="form-input" value={flexibleShift.label} onChange={e => setFlexibleShift({ ...flexibleShift, label: e.target.value })} placeholder="Örn: Eğitim" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowFlexibleModal(false)}>İptal</button>
                            <button className="btn btn-success" onClick={handleFlexibleCreate}>Ekle</button>
                        </div>
                    </div>
                </div>
            )}

            {advancedModalOpen && editingUser && (
                <div className="modal-overlay" onClick={() => setAdvancedModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingUser.full_name} - Vardiya Yönetimi</h3>
                            <div className="text-muted small">{new Date(selectedDate).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <button className="modal-close" onClick={() => setAdvancedModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="tabs" style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', marginBottom: 15 }}>
                                <button className="tab-btn active" style={{ padding: '8px 16px', borderBottom: '2px solid var(--primary)', fontWeight: 600 }}>Günlük</button>
                                <button className="tab-btn" style={{ padding: '8px 16px', color: 'var(--text-muted)' }} disabled>Haftalık (Yakında)</button>
                            </div>

                            <div className="daily-view">
                                <h4 style={{ fontSize: 14, marginBottom: 10, color: 'var(--text-muted)' }}>Hızlı Stok Atama</h4>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                    {[
                                        { label: '11:00 - 20:00 (Sabah)', start: '11:00', end: '20:00', color: '#6366f1' },
                                        { label: '13:00 - 22:00 (Akşam)', start: '13:00', end: '22:00', color: '#8b5cf6' }
                                    ].map(stock => (
                                        <button
                                            key={stock.label}
                                            className="btn"
                                            style={{ flex: 1, backgroundColor: stock.color, color: 'white', border: 'none' }}
                                            onClick={async () => {
                                                try {
                                                    await api.post('/shifts', {
                                                        user_id: editingUser.id,
                                                        shift_date: selectedDate,
                                                        start_time: stock.start,
                                                        end_time: stock.end,
                                                        special_status: 'Mesai'
                                                    });
                                                    loadData();
                                                    setAdvancedModalOpen(false);
                                                } catch (err) { alert('Hata: ' + err.message); }
                                            }}
                                        >
                                            {stock.label}
                                        </button>
                                    ))}
                                </div>

                                <h4 style={{ fontSize: 14, marginBottom: 10, color: 'var(--text-muted)' }}>Özel Saat Gir</h4>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="form-label" style={{ fontSize: 12 }}>Başlangıç</label>
                                        <input type="time" className="form-input" id="custom-start" defaultValue="09:00" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label className="form-label" style={{ fontSize: 12 }}>Bitiş</label>
                                        <input type="time" className="form-input" id="custom-end" defaultValue="18:00" />
                                    </div>
                                    <button className="btn btn-primary" onClick={async () => {
                                        const s = document.getElementById('custom-start').value;
                                        const e = document.getElementById('custom-end').value;
                                        if (!s || !e) return alert('Saat giriniz');
                                        try {
                                            await api.post('/shifts', {
                                                user_id: editingUser.id,
                                                shift_date: selectedDate,
                                                start_time: s,
                                                end_time: e,
                                                special_status: 'Mesai' // Default
                                            });
                                            loadData();
                                            setAdvancedModalOpen(false);
                                        } catch (err) { alert('Hata'); }
                                    }}>Ekle</button>
                                </div>

                                <h4 style={{ fontSize: 14, marginTop: 20, marginBottom: 10, color: 'var(--text-muted)' }}>Mevcut Vardiyalar</h4>
                                <div className="current-shifts-list">
                                    {shifts.filter(s => s.user_id === editingUser.id).map(shift => (
                                        <div key={shift.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 4, marginBottom: 5 }}>
                                            <span>{shift.start_time} - {shift.end_time} ({shift.special_status || 'Mesai'})</span>
                                            <button className="btn btn-danger btn-sm" onClick={async () => {
                                                await api.delete(`/shifts/${shift.id}`);
                                                loadData();
                                            }}>Sil</button>
                                        </div>
                                    ))}
                                    {shifts.filter(s => s.user_id === editingUser.id).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Vardiya yok.</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showReportModal && (
                <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Rapor Oluştur</h3>
                            <button className="modal-close" onClick={() => setShowReportModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Rapor Tipi</label>
                                <select className="form-select" value={reportConfig.type} onChange={e => setReportConfig({ ...reportConfig, type: e.target.value })}>
                                    <option value="daily">Seçili Gün ({selectedDate})</option>
                                    <option value="range">Tarih Aralığı</option>
                                </select>
                            </div>
                            {reportConfig.type === 'range' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Başlangıç</label>
                                        <input type="date" className="form-input" value={reportConfig.start} onChange={e => setReportConfig({ ...reportConfig, start: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Bitiş</label>
                                        <input type="date" className="form-input" value={reportConfig.end} onChange={e => setReportConfig({ ...reportConfig, end: e.target.value })} />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowReportModal(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={handleGenerateReport}>İndir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
