import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function MyShifts() {
    const { user } = useAuth();
    const [shifts, setShifts] = useState([]);
    const [filter, setFilter] = useState('upcoming'); // upcoming, past, all
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => { loadShifts(); }, []);

    const loadShifts = async () => {
        try {
            const res = await api.get('/shifts/me');
            setShifts(res.data);
        } catch (err) { console.error(err); }
    };

    const getFilteredShifts = () => {
        let filtered = [...shifts];
        const today = new Date().toISOString().split('T')[0];

        if (dateRange.start && dateRange.end) {
            filtered = filtered.filter(s => s.shift_date >= dateRange.start && s.shift_date <= dateRange.end);
        } else {
            if (filter === 'upcoming') filtered = filtered.filter(s => s.shift_date >= today);
            if (filter === 'past') filtered = filtered.filter(s => s.shift_date < today);
        }
        return filtered.sort((a, b) => a.shift_date.localeCompare(b.shift_date));
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        doc.text(`Vardiya Geçmişim - ${user.full_name}`, 14, 15);

        const data = getFilteredShifts().map(s => [
            new Date(s.shift_date).toLocaleDateString('tr-TR'),
            s.start_time,
            s.end_time,
            s.special_status || '-'
        ]);

        doc.autoTable({
            startY: 20,
            head: [['Tarih', 'Başlangıç', 'Bitiş', 'Durum']],
            body: data,
        });

        doc.save('vardiya_gecmisim.pdf');
    };

    const filteredShifts = getFilteredShifts();

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📅 Vardiyalarım</h1>
                    <p className="page-subtitle">Çalışma programınızı görüntüleyin ve indirin</p>
                </div>
                <button className="btn btn-primary" onClick={downloadPDF}>📄 PDF İndir</button>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Görünüm</label>
                        <select className="form-select" value={filter} onChange={e => { setFilter(e.target.value); setDateRange({ start: '', end: '' }); }}>
                            <option value="upcoming">Gelecek Vardiyalar</option>
                            <option value="past">Geçmiş Vardiyalar</option>
                            <option value="all">Tümü</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Başlangıç</label>
                        <input type="date" className="form-input" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Bitiş</label>
                        <input type="date" className="form-input" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                    </div>
                </div>
            </div>

            <div className="card table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Tarih</th>
                            <th>Başlangıç</th>
                            <th>Bitiş</th>
                            <th>Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredShifts.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Kayıt bulunamadı.</td></tr>}
                        {filteredShifts.map(s => (
                            <tr key={s.id} style={{ opacity: s.special_status ? 0.7 : 1 }}>
                                <td>{new Date(s.shift_date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                <td>{s.start_time}</td>
                                <td>{s.end_time}</td>
                                <td>
                                    {s.special_status ? (
                                        <span className="badge badge-warning">{s.special_status}</span>
                                    ) : (
                                        <span className="badge badge-success">Mesai</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
