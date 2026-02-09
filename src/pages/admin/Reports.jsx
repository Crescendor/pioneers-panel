import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function AdminReports() {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [period, setPeriod] = useState('weekly');

    useEffect(() => { loadTeams(); }, []);

    const loadTeams = async () => {
        const res = await api.get('/teams');
        setTeams(res.data);
        if (user?.role === 'TeamLead') setSelectedTeam(user.team_id);
    };

    const downloadReport = () => {
        if (!selectedTeam) return alert('Takım seçin');
        const url = `/api/reports/export/${selectedTeam}?period=${period}`;
        window.open(url, '_blank');
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📥 Rapor İndir</h1>
                    <p className="page-subtitle">Takım raporlarını Excel olarak indirin</p>
                </div>
            </div>

            <div className="card" style={{ maxWidth: 500 }}>
                {user?.role === 'SuperAdmin' && (
                    <div className="form-group">
                        <label className="form-label">Takım</label>
                        <select className="form-select" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
                            <option value="">Seçin...</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                )}
                <div className="form-group">
                    <label className="form-label">Dönem</label>
                    <select className="form-select" value={period} onChange={e => setPeriod(e.target.value)}>
                        <option value="daily">Günlük</option>
                        <option value="weekly">Haftalık</option>
                        <option value="monthly">Aylık</option>
                    </select>
                </div>
                <button className="btn btn-primary btn-lg" onClick={downloadReport} style={{ width: '100%' }}>📥 Excel İndir</button>
            </div>
        </div>
    );
}
