export default function PioneersAI() {
    return (
        <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div className="card" style={{ textAlign: 'center', maxWidth: 500 }}>
                <div style={{ fontSize: 80, marginBottom: 24 }}>🤖</div>
                <h2 style={{ marginBottom: 12 }}>Pioneers AI</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                    AI asistanımız şu anda geliştirme aşamasında. Yakında sizlerle!
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span className="badge badge-primary">Yapay Zeka</span>
                    <span className="badge badge-warning">Geliştiriliyor</span>
                    <span className="badge badge-success">Yakında</span>
                </div>
            </div>
        </div>
    );
}
