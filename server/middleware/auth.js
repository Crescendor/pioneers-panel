import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pioneers_secret_key';

export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token' });
        }
        req.user = user;
        next();
    });
}

export function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            agent_number: user.agent_number,
            role: user.role,
            team_id: user.team_id
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}
