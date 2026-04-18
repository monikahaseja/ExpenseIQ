const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Theme = require('../models/Theme');

// @route   GET /api/themes
// @desc    Get user's custom theme preference
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const theme = await Theme.findOne({ userId });
        res.json({ message: 'Theme fetched successfully', data: theme, total_data: theme ? 1 : 0 });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/themes
// @desc    Set or update theme preference
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { mode } = req.body; // 'light' or 'dark'
        const userId = req.user.id || req.user.userId;

        let theme = await Theme.findOne({ userId });
        if (theme) {
            theme.mode = mode;
            await theme.save();
        } else {
            theme = new Theme({ userId, mode });
            await theme.save();
        }

        res.status(201).json({ message: 'Theme saved successfully', data: theme, total_data: 1 });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
