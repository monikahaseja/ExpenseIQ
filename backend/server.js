const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: true, // Allow all origins or specify your frontend URL
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/appnames', require('./routes/appnames'));
app.use('/api/analytics', require('./routes/analytics'));

// Health check
app.get('/health', (req, res) => res.send('API is running...'));

// Database connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expenseiq';

console.log('Connecting to MongoDB...');

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected successfully');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server is up and running on all interfaces!`);
            console.log(`📡 Local: http://localhost:${PORT}`);
            console.log(`🔗 API Base URL: http://192.168.0.115:${PORT}/api`);
        });
    })
    .catch(err => {
        console.error('❌ Database connection error:');
        console.error(err.message);
        console.log('\nTip: Make sure MongoDB is running on your machine.');
        console.log('If you haven\'t installed MongoDB, you can download it from: https://www.mongodb.com/try/download/community');
        process.exit(1);
    });
