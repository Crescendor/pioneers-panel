export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Yetkilendirme gerekli' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }

        next();
    };
}

export function requireSameTeamOrAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }

    if (req.user.role === 'SuperAdmin') {
        return next();
    }

    // For TeamLead, check if target user is in their team
    const targetTeamId = req.body.team_id || req.params.teamId;

    if (req.user.role === 'TeamLead' && req.user.team_id === parseInt(targetTeamId)) {
        return next();
    }

    if (req.user.team_id === parseInt(targetTeamId)) {
        return next();
    }

    return res.status(403).json({ error: 'Bu takıma erişim yetkiniz yok' });
}
