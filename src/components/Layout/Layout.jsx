import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'TeamLead';

    return (
        <div className="layout">
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? '✕' : '☰'}
            </button>

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <img src="https://i.ibb.co/PV2M5vG/Untitled-750-x-750-px.png" alt="Pioneers" className="logo-img" />
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <NavLink to="/dashboard" className="nav-item" onClick={() => setSidebarOpen(false)}>
                            <span className="nav-icon">🏠</span>
                            <span>Dashboard</span>
                        </NavLink>
                        <NavLink to="/breaks" className="nav-item" onClick={() => setSidebarOpen(false)}>
                            <span className="nav-icon">☕</span>
                            <span>Molalarım</span>
                        </NavLink>
                        <NavLink to="/reports" className="nav-item" onClick={() => setSidebarOpen(false)}>
                            <span className="nav-icon">📊</span>
                            <span>Raporlarım</span>
                        </NavLink>
                        <NavLink to="/my-shifts" className="nav-item" onClick={() => setSidebarOpen(false)}>
                            <span className="nav-icon">📅</span>
                            <span>Vardiyalarım</span>
                        </NavLink>
                        <NavLink to="/pioneers-ai" className="nav-item" onClick={() => setSidebarOpen(false)}>
                            <span className="nav-icon">🤖</span>
                            <span>Pioneers AI</span>
                        </NavLink>
                        <NavLink to="/settings" className="nav-item" onClick={() => setSidebarOpen(false)}>
                            <span className="nav-icon">⚙️</span>
                            <span>Ayarlarım</span>
                        </NavLink>
                        <NavLink to="/notes" className="nav-item" onClick={() => setSidebarOpen(false)}>
                            <span className="nav-icon">📝</span>
                            <span>Notlar</span>
                        </NavLink>
                        <NavLink to="/requests" className="nav-item" onClick={() => setSidebarOpen(false)}>
                            <span className="nav-icon">📨</span>
                            <span>Talepler</span>
                        </NavLink>
                    </div>

                    {isAdmin && (
                        <div className="nav-section">
                            <div className="nav-section-title">Yönetim</div>
                            {user?.role === 'SuperAdmin' && (
                                <NavLink to="/admin/users" className="nav-item" onClick={() => setSidebarOpen(false)}>
                                    <span className="nav-icon">👥</span>
                                    <span>Kullanıcılar</span>
                                </NavLink>
                            )}
                            <NavLink to="/admin/teams" className="nav-item" onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon">🏢</span>
                                <span>Takımlar</span>
                            </NavLink>
                            <NavLink to="/admin/team-monitoring" className="nav-item" onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon">👥</span>
                                <span>Takımım</span>
                            </NavLink>
                            <NavLink to="/admin/shifts" className="nav-item" onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon">📆</span>
                                <span>Vardiya Yönetimi</span>
                            </NavLink>
                            <NavLink to="/admin/notes" className="nav-item" onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon">📋</span>
                                <span>Not Yönetimi</span>
                            </NavLink>
                            <NavLink to="/admin/reports" className="nav-item" onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon">📥</span>
                                <span>Rapor İndir</span>
                            </NavLink>
                            <NavLink to="/admin/requests" className="nav-item" onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon">✉️</span>
                                <span>Talepler</span>
                            </NavLink>
                        </div>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{user?.full_name?.charAt(0) || 'U'}</div>
                        <div className="user-details">
                            <div className="user-name">{user?.full_name}</div>
                            <div className="user-role">{user?.role === 'SuperAdmin' ? 'Super Admin' : user?.role === 'TeamLead' ? 'Takım Lideri' : 'Agent'}</div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Çıkış</button>
                    <div className="sidebar-copyright">
                        © 2026 Pioneers by Burakcan Aydın Tüm hakları saklıdır.
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>

            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        </div>
    );
}
