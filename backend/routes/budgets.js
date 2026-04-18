const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Budget = require('../models/Budget');

// @route   GET /api/budgets
// @desc    Get user budget for a specific month or all
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { month } = req.query;
        let query = { userId: req.user.id || req.user.userId };
        if (month) query.month = month;
        
        const budgets = await Budget.find(query);
        res.json({ message: 'Budgets fetched successfully', data: budgets, total_data: budgets.length });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/budgets
// @desc    Set or update budget for a month
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { month, amount } = req.body;
        const userId = req.user.id || req.user.userId;

        let budget = await Budget.findOne({ userId, month });
        if (budget) {
            budget.amount = amount;
            await budget.save();
        } else {
            budget = new Budget({ userId, month, amount });
            await budget.save();
        }

        res.status(201).json({ message: 'Budget saved successfully', data: budget, total_data: 1 });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
