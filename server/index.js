const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db'); // init DB

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || true,
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/projects/:projectId/milestones', require('./routes/milestoneRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Serve React build
const buildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(buildPath));
app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
