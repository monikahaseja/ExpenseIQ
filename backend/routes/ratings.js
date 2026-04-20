const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Rating = require('../models/Rating');

// @route   POST /api/ratings
// @desc    Submit or update a rating
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { rating, feedback } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        let existing = await Rating.findOne({ userId });

        if (existing) {
            existing.rating = rating;
            existing.feedback = feedback || '';
            existing.updated_at = Date.now();
            await existing.save();
            return res.json({ message: 'Rating updated successfully', data: existing });
        }

        const newRating = new Rating({ userId, rating, feedback: feedback || '' });
        await newRating.save();
        res.status(201).json({ message: 'Rating submitted successfully', data: newRating });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/ratings
// @desc    Get current user's rating
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const rating = await Rating.findOne({ userId });
        res.json({ message: 'Rating fetched', data: rating });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/ratings/stats
// @desc    Get average rating and total count
// @access  Private
router.get('/stats', auth, async (req, res) => {
    try {
        const stats = await Rating.aggregate([
            { $group: { _id: null, avgRating: { $avg: '$rating' }, totalRatings: { $sum: 1 } } }
        ]);
        const result = stats.length > 0 ? { avgRating: stats[0].avgRating.toFixed(1), totalRatings: stats[0].totalRatings } : { avgRating: '0', totalRatings: 0 };
        res.json({ message: 'Stats fetched', data: result });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
