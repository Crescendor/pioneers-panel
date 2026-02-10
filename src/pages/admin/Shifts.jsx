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
    const [shifts, setShifts] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingShift, setEditingShift] = useState(null);
    const [loading, setLoading] = useState(false);
    const [draggedTemplate, setDraggedTemplate] = useState(null);

    // User Schedule Modal
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [agentDateRange, setAgentDateRange] = useState({ start: '', end: '', status: 'Raporlu' });

    const shiftTemplates = [
        { label: 'Sabah', start: '11:00', end: '20:00', color: '#6366f1' },
        { label: 'Akşam', start: '13:00', end: '22:00', color: '#8b5cf6' },
        { label: 'İzin', start: '00:00', end: '00:00', color: '#ef4444', isOff: true }
    ];

    useEffect(() => { loadTeams(); }, []);
    useEffect(() => { if (selectedTeam) loadData(); }, [selectedTeam, selectedDate]);

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
                special_status: draggedTemplate.isOff ? 'İzin' : null
            };
            await api.post('/shifts', shiftData);
            loadData();
        } catch (err) {
            alert('Vardiya atanamadı');
        } finally {
            setDraggedTemplate(null);
        }
    };

    const handleBulkAssign = async () => {
        const password = prompt('Seçili tüm agentlara bu vardiyayı atamak istiyor musunuz? (Onay için "pioneers" yazın)');
        if (password !== 'pioneers') return;

        const start = prompt('Başlangıç saati (HH:mm)', '11:00');
        const end = prompt('Bitiş saati (HH:mm)', '20:00');
        if (!start || !end) return;

        const shiftsToCreate = users.map(u => ({
            user_id: u.id,
            shift_date: selectedDate,
            start_time: start,
            end_time: end
        }));

        await api.post('/shifts/bulk', { shifts: shiftsToCreate });
        loadData();
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        doc.text(`Vardiya Planı - ${selectedDate}`, 14, 15);

        const tableBody = users.map(u => {
            const shift = shifts.find(s => s.user_id === u.id);
            return [
                `NOT_IZM_${u.agent_number}`,
                u.full_name,
                shift ? `${shift.start_time} - ${shift.end_time}` : 'Atanmadı',
                shift?.special_status || '-'
            ];
        });

        doc.autoTable({
            startY: 20,
            head: [['Agent No', 'İsim Soyisim', 'Vardiya', 'Durum']],
            body: tableBody,
        });

        doc.save(`vardiya_${selectedDate}.pdf`);
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
                    <p className="page-subtitle">Sürükle bırak ile kolayca planlama yapın</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={downloadPDF}>📄 PDF İndir</button>
                    <button className="btn btn-primary" onClick={handleBulkAssign}>🚀 Toplu Atama</button>
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
                    <div className="agent-col">Agent</div>
                    <div className="timeline-axis">
                        {Array.from({ length: 12 }, (_, i) => 11 + i).map(h => (
                            <div key={h} className="hour-mark">{h}:00</div>
                        ))}
                    </div>
                </div>

                <div className="grid-body">
                    {users.map(u => {
                        const shift = shifts.find(s => s.user_id === u.id);
                        return (
                            <div
                                key={u.id}
                                className="grid-row"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDrop(u.id)}
                            >
                                <div className="agent-cell">
                                    <div className="agent-mini-info">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div
                                                    className="name"
                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={() => setSelectedAgent(u)}
                                                >
                                                    {u.full_name}
                                                </div>
                                                <div className="id">NOT_IZM_{u.agent_number}</div>
                                            </div>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                                onClick={() => {
                                                    const doc = new jsPDF();
                                                    doc.text(`Vardiya Belgesi - ${u.full_name}`, 14, 15);
                                                    doc.text(`Tarih: ${selectedDate}`, 14, 25);
                                                    doc.autoTable({
                                                        startY: 35,
                                                        head: [['Kriter', 'Bilgi']],
                                                        body: [
                                                            ['Agent No', `NOT_IZM_${u.agent_number}`],
                                                            ['İsim Soyisim', u.full_name],
                                                            ['Mesai Başlangıç', shift?.start_time || 'Atanmadı'],
                                                            ['Mesai Bitiş', shift?.end_time || 'Atanmadı'],
                                                            ['Özel Durum', shift?.special_status || '-']
                                                        ]
                                                    });
                                                    doc.save(`vardiya_${u.agent_number}_${selectedDate}.pdf`);
                                                }}
                                            >📄</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="timeline-cell">
                                    {shift && (
                                        <div
                                            className="shift-bar"
                                            style={{
                                                left: `${getTimelinePos(shift.start_time)}%`,
                                                width: `${getTimelinePos(shift.end_time) - getTimelinePos(shift.start_time)}%`,
                                                backgroundColor: shift.special_status === 'İzin' ? '#ef4444' : '#6366f1'
                                            }}
                                            onClick={() => setEditingShift(shift)}
                                        >
                                            <span className="time-text">{shift.start_time} - {shift.end_time}</span>
                                        </div>
                                    )}
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

            {selectedAgent && (
                <div className="modal-overlay" onClick={() => setSelectedAgent(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{selectedAgent.full_name} - Toplu İşlem</h3>
                            <button className="modal-close" onClick={() => setSelectedAgent(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Başlangıç Tarihi</label>
                                <input type="date" className="form-input" value={agentDateRange.start} onChange={e => setAgentDateRange({ ...agentDateRange, start: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bitiş Tarihi</label>
                                <input type="date" className="form-input" value={agentDateRange.end} onChange={e => setAgentDateRange({ ...agentDateRange, end: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Durum</label>
                                <select className="form-select" value={agentDateRange.status} onChange={e => setAgentDateRange({ ...agentDateRange, status: e.target.value })}>
                                    <option value="Raporlu">Raporlu</option>
                                    <option value="İzinli">İzinli</option>
                                    <option value="Eğitim">Eğitim</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setSelectedAgent(null)}>İptal</button>
                            <button className="btn btn-primary" onClick={handleAgentBulkAction}>Uygula</button>
                        </div>
                    </div>
                </div>
            )}
            {selectedAgent && (
                <div className="modal-overlay" onClick={() => setSelectedAgent(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{selectedAgent.full_name} - Toplu İşlem</h3>
                            <button className="modal-close" onClick={() => setSelectedAgent(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Başlangıç Tarihi</label>
                                <input type="date" className="form-input" value={agentDateRange.start} onChange={e => setAgentDateRange({ ...agentDateRange, start: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bitiş Tarihi</label>
                                <input type="date" className="form-input" value={agentDateRange.end} onChange={e => setAgentDateRange({ ...agentDateRange, end: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Durum</label>
                                <select className="form-select" value={agentDateRange.status} onChange={e => setAgentDateRange({ ...agentDateRange, status: e.target.value })}>
                                    <option value="Raporlu">Raporlu</option>
                                    <option value="İzinli">İzinli</option>
                                    <option value="Eğitim">Eğitim</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setSelectedAgent(null)}>İptal</button>
                            <button className="btn btn-primary" onClick={handleAgentBulkAction}>Uygula</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
