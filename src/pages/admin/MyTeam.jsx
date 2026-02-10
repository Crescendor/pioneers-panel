import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './MyTeam.css';

export default function MyTeam() {
    const { user } = useAuth();
    const [teamData, setTeamData] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const fetchTeamStatus = async () => {
            if (!user?.team_id) return;
            try {
                const res = await api.get(`/teams/${user.team_id}/monitoring`);
                setTeamData(res.data);
            } catch (err) {
                console.error('Monitoring data fetch error:', err);
            }
        };

        fetchTeamStatus();
        const interval = setInterval(fetchTeamStatus, 30000); // Poll every 30s
        const timer = setInterval(() => setCurrentTime(new Date()), 1000); // Seconds for smooth movement

        return () => {
            clearInterval(interval);
            clearInterval(timer);
        };
    }, [user?.team_id]);

    const hours = Array.from({ length: 12 }, (_, i) => 11 + i); // 11 to 22

    const getPosition = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const h = date.getHours();
        const m = date.getMinutes();
        if (h < 11) return 0;
        if (h >= 22) return 100;
        return ((h - 11) * 60 + m) / (11 * 60) * 100;
    };

    const redLinePos = ((currentTime.getHours() - 11) * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60) / (11 * 60) * 100;

    return (
        <div className="page my-team">
            <div className="page-header">
                <div>
                    <h1 className="page-title">👥 Takım İzleme</h1>
                    <p className="page-subtitle">Agent aktivitelerini anlık takip edin</p>
                </div>
            </div>

            <div className="card monitoring-card">
                <div className="timeline-header">
                    <div className="agent-name-col">Agent</div>
                    <div className="timeline-labels">
                        {hours.map(h => (
                            <div key={h} className="hour-label">{h}:00</div>
                        ))}
                    </div>
                </div>

                <div className="monitoring-container">
                    <div className="timeline-wrapper">
                        {/* Red Line Indicator */}
                        {currentTime.getHours() >= 11 && currentTime.getHours() < 22 && (
                            <div
                                className="current-time-marker"
                                style={{ left: `${redLinePos}%` }}
                            >
                                <div className="marker-label">
                                    {currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        )}

                        {teamData.map(agent => (
                            <div key={agent.id} className="agent-row">
                                <div className="agent-info">
                                    <div className="agent-avatar">{agent.full_name.charAt(0)}</div>
                                    <div className="agent-details">
                                        <div className="name">{agent.full_name}</div>
                                        <div className={`status-badge status-${agent.current_status || 'idle'}`}>
                                            {agent.current_status === 'active' ? 'Çalışıyor' :
                                                agent.current_status === 'break' ? 'Molada' :
                                                    agent.current_status === 'paused' ? 'Duraklatıldı' : 'Çevrimdışı'}
                                        </div>
                                    </div>
                                </div>

                                <div className="agent-timeline">
                                    {/* Work Session Bar */}
                                    {agent.session_start && (
                                        <div
                                            className="activity-bar work-bar"
                                            style={{
                                                left: `${getPosition(agent.session_start)}%`,
                                                width: `${(agent.session_end ? getPosition(agent.session_end) : (currentTime.getHours() >= 22 ? 100 : redLinePos)) - getPosition(agent.session_start)}%`
                                            }}
                                        ></div>
                                    )}

                                    {/* Breaks */}
                                    {agent.breaks?.map(brk => (
                                        <div
                                            key={brk.id}
                                            className={`activity-bar break-bar status-${brk.status}`}
                                            style={{
                                                left: `${getPosition(brk.actual_start || brk.scheduled_start)}%`,
                                                width: `${(getPosition(brk.actual_end || brk.scheduled_end)) - getPosition(brk.actual_start || brk.scheduled_start)}%`
                                            }}
                                            title={`${brk.duration_minutes}dk Mola (${brk.status})`}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
