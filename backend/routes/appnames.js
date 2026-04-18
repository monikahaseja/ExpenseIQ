const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AppName = require('../models/AppName');

// @route   GET /api/appnames
// @desc    Get user's customized app name
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const appName = await AppName.findOne({ userId });
        res.json({ message: 'AppName fetched successfully', data: appName, total_data: appName ? 1 : 0 });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/appnames
// @desc    Set or update the custom app name
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id || req.user.userId;

        let appName = await AppName.findOne({ userId });
        if (appName) {
            appName.name = name;
            await appName.save();
        } else {
            appName = new AppName({ userId, name });
            await appName.save();
        }

        res.status(201).json({ message: 'AppName saved successfully', data: appName, total_data: 1 });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
