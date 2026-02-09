import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
    const [agentNumber, setAgentNumber] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(agentNumber, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Giriş başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">
                        <img src="https://i.ibb.co/PV2M5vG/Untitled-750-x-750-px.png" alt="Pioneers" className="login-logo-img" />
                    </div>
                    {/* Titles removed as per request */}
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {error && <div className="login-error">{error}</div>}

                    <div className="form-group">
                        <label className="form-label">Agent Numarası</label>
                        <input
                            type="text"
                            className="form-input"
                            value={agentNumber}
                            onChange={(e) => setAgentNumber(e.target.value)}
                            placeholder="Agent numaranızı girin"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Şifre</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Şifrenizi girin"
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg login-btn" disabled={loading}>
                        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>© 2026 Pioneers by Burakcan Aydın Tüm hakları saklıdır.</p>
                </div>
            </div>

            <div className="login-bg">
                <div className="login-bg-gradient"></div>
                <div className="login-bg-pattern"></div>
            </div>
        </div>
    );
}
