import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import teamsRoutes from './routes/teams.js';
import shiftsRoutes from './routes/shifts.js';
import breaksRoutes from './routes/breaks.js';
import reportsRoutes from './routes/reports.js';
import notesRoutes from './routes/notes.js';
import requestsRoutes from './routes/requests.js';
import suggestionsRoutes from './routes/suggestions.js';
import sessionsRoutes from './routes/sessions.js';

import { initDatabase } from './config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/breaks', breaksRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/sessions', sessionsRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

// Initialize database and start server
async function start() {
    try {
        await initDatabase();
        app.listen(PORT, () => {
            console.log(`🚀 Pioneers Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
}

start();
