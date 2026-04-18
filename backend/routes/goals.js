const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Goal = require('../models/Goal');

// @route   GET /api/goals
// @desc    Get all user goals
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const goals = await Goal.find({ userId }).sort({ created_at: -1 });
        const processedGoals = goals.map(g => ({
            id: g._id,  // Standardize the id response
            title: g.title,
            target_amount: g.target_amount,
            current_amount: g.current_amount,
            deadline: g.deadline,
            icon: g.icon,
            color: g.color,
            created_at: g.created_at
        }));
        res.json({ message: "Goals fetched successfully", data: processedGoals, total_data: processedGoals.length });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/goals
// @desc    Create a goal
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { title, target_amount, current_amount, icon, color, deadline } = req.body;
        const userId = req.user.id || req.user.userId;
        const newGoal = new Goal({
            userId,
            title,
            target_amount,
            current_amount: current_amount || 0,
            icon,
            color,
            deadline
        });

        const goal = await newGoal.save();
        res.status(201).json({ message: "Goal created successfully", data: goal, total_data: 1 });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/goals/:id/progress
// @desc    Update progress of a goal
// @access  Private
router.put('/:id/progress', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        let goal = await Goal.findById(req.params.id);

        if (!goal) return res.status(404).json({ message: 'Goal not found' });
        const userId = req.user.id || req.user.userId;
        if (goal.userId.toString() !== userId) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        goal.current_amount += parseFloat(amount);
        await goal.save();

        res.json({ message: "Progress updated successfully", data: goal, total_data: 1 });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Goal not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/goals/:id
// @desc    Delete a goal
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);

        if (!goal) return res.status(404).json({ message: 'Goal not found' });
        const userId = req.user.id || req.user.userId;
        if (goal.userId.toString() !== userId) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await goal.deleteOne();
        res.json({ message: 'Goal removed', data: null, total_data: 0 });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Goal not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
