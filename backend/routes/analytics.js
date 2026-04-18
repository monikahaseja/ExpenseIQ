const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

// @route   GET /api/analytics
// @desc    Get aggregated analytics data for a specific month
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { month, year, all } = req.query; 
        const userId = req.user.id || req.user.userId;
        let query = { userId };

        if (month && !all && !year) {
            const startDate = new Date(`${month}-01T00:00:00.000Z`);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
            query.created_at = { $gte: startDate, $lt: endDate };
        } else if (year && !all) {
            const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
            const endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + 1);
            query.created_at = { $gte: startDate, $lt: endDate };
        }


        const expenses = await Expense.find(query);
        const budget = await Budget.findOne({ userId, month });

        res.json({
            message: 'Analytics data fetched successfully',
            data: {
                expenses,
                budgetAmount: budget ? budget.amount : 0
            },
            total_data: expenses.length
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
