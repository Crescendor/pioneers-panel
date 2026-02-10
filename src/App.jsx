import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Breaks from './pages/Breaks';
import Reports from './pages/Reports';
import Shifts from './pages/Shifts';
import PioneersAI from './pages/PioneersAI';
import Settings from './pages/Settings';
import Notes from './pages/Notes';
import Requests from './pages/Requests';
import AdminUsers from './pages/admin/Users';
import AdminTeams from './pages/admin/Teams';
import AdminShifts from './pages/admin/Shifts';
import AdminNotes from './pages/admin/Notes';
import AdminReports from './pages/admin/Reports';
import AdminRequests from './pages/admin/Requests';
import AdminRequests from './pages/admin/Requests';
import MyTeam from './pages/admin/MyTeam';
import MyShifts from './pages/MyShifts';

function PrivateRoute({ children, roles }) {
    const { user, loading } = useAuth();

    if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
    if (!user) return <Navigate to="/login" />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;

    return children;
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                        <Route index element={<Navigate to="/dashboard" />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="breaks" element={<Breaks />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="my-shifts" element={<MyShifts />} />
                        <Route path="pioneers-ai" element={<PioneersAI />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="notes" element={<Notes />} />
                        <Route path="requests" element={<Requests />} />
                        <Route path="admin/users" element={<PrivateRoute roles={['SuperAdmin']}><AdminUsers /></PrivateRoute>} />
                        <Route path="admin/teams" element={<PrivateRoute roles={['SuperAdmin', 'TeamLead']}><AdminTeams /></PrivateRoute>} />
                        <Route path="admin/shifts" element={<PrivateRoute roles={['SuperAdmin', 'TeamLead']}><AdminShifts /></PrivateRoute>} />
                        <Route path="admin/notes" element={<PrivateRoute roles={['SuperAdmin', 'TeamLead']}><AdminNotes /></PrivateRoute>} />
                        <Route path="admin/reports" element={<PrivateRoute roles={['SuperAdmin', 'TeamLead']}><AdminReports /></PrivateRoute>} />
                        <Route path="admin/requests" element={<PrivateRoute roles={['SuperAdmin', 'TeamLead']}><AdminRequests /></PrivateRoute>} />
                        <Route path="admin/team-monitoring" element={<PrivateRoute roles={['SuperAdmin', 'TeamLead']}><MyTeam /></PrivateRoute>} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
