import { useState } from 'react';
import api from '../utils/api';

export default function Settings() {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(''); setError('');
        if (newPassword !== confirmPassword) {
            setError('Yeni şifreler eşleşmiyor');
            return;
        }
        try {
            await api.put('/users/change-password/me', { old_password: oldPassword, new_password: newPassword });
            setMessage('Şifre başarıyla değiştirildi');
            setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err) { setError(err.response?.data?.error || 'Hata'); }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">⚙️ Ayarlarım</h1>
                    <p className="page-subtitle">Hesap ayarlarınızı yönetin</p>
                </div>
            </div>

            <div className="card" style={{ maxWidth: 500 }}>
                <h3 className="card-title">Şifre Değiştir</h3>
                <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
                    {message && <div style={{ padding: 12, background: 'rgba(34,197,94,0.15)', border: '1px solid var(--secondary)', borderRadius: 'var(--radius-sm)', marginBottom: 16, color: '#4ade80' }}>{message}</div>}
                    {error && <div style={{ padding: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', marginBottom: 16, color: '#f87171' }}>{error}</div>}
                    <div className="form-group">
                        <label className="form-label">Mevcut Şifre</label>
                        <input type="password" className="form-input" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Yeni Şifre</label>
                        <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Yeni Şifre (Tekrar)</label>
                        <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary">Şifreyi Değiştir</button>
                </form>
            </div>
        </div>
    );
}
