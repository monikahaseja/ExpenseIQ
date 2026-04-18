const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// @route   GET /api/notifications
// @desc    Get all user notifications
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
        const processed = notifications.map(n => ({
            id: n._id,
            message: n.message,
            type: n.type,
            is_read: n.is_read,
            created_at: n.createdAt
        }));
        res.json({ message: "Notifications fetched successfully", data: processed, total_data: processed.length });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/notifications
// @desc    Create a notification (e.g., from frontend action)
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { message, type } = req.body;
        const userId = req.user.id || req.user.userId;
        const newNotification = new Notification({
            userId,
            message,
            type: type || 'info'
        });

        const notification = await newNotification.save();
        res.status(201).json({ message: "Notification created successfully", data: notification, total_data: 1 });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
    try {
        let notification = await Notification.findById(req.params.id);

        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        const userId = req.user.id || req.user.userId;
        if (notification.userId.toString() !== userId) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        notification.is_read = true;
        await notification.save();

        res.json({ message: "Notification marked as read", data: notification, total_data: 1 });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all user notifications as read
// @access  Private
router.put('/read-all', auth, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        await Notification.updateMany(
            { userId, is_read: false },
            { $set: { is_read: true } }
        );
        res.json({ message: "All notifications marked as read", data: null, total_data: 0 });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/notifications/all
// @desc    Clear all user notifications
// @access  Private
router.delete('/all', auth, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        await Notification.deleteMany({ userId });
        res.json({ message: 'All notifications cleared', data: null, total_data: 0 });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        const userId = req.user.id || req.user.userId;
        if (notification.userId.toString() !== userId) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await notification.deleteOne();
        res.json({ message: 'Notification removed', data: null, total_data: 0 });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
