const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expenseiq';

const seedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Find the first available user
        const user = await User.findOne();
        if (!user) {
            console.log('No user found! Please register an account in the app first.');
            process.exit(1);
        }

        const userId = user._id;
        console.log(`Seeding data for user: ${user.name}`);

        // Delete existing expenses to start fresh (optional, but requested for checking analytics cleanly)
        await Transaction.deleteMany({ userId });
        console.log('Cleared old expenses');

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-indexed

        const mockData = [
            { title: 'Monthly Salary', amount: 45000, type: 'income', category: 'salary', payment_mode: 'bank', created_at: new Date(currentYear, currentMonth, 1, 10, 0) },
            
            { title: 'Groceries (D-Mart)', amount: 4200, type: 'expense', category: 'food', payment_mode: 'card', created_at: new Date(currentYear, currentMonth, 3, 14, 30) },
            { title: 'Electricity Bill', amount: 1850, type: 'expense', category: 'bills', payment_mode: 'upi', created_at: new Date(currentYear, currentMonth, 5, 9, 15) },
            { title: 'Uber to Office', amount: 350, type: 'expense', category: 'transport', payment_mode: 'cash', created_at: new Date(currentYear, currentMonth, 6, 8, 45) },
            { title: 'Netflix Subscription', amount: 649, type: 'expense', category: 'entertainment', payment_mode: 'card', created_at: new Date(currentYear, currentMonth, 8, 12, 0) },
            { title: 'Weekend Dinner', amount: 2400, type: 'expense', category: 'food', payment_mode: 'card', created_at: new Date(currentYear, currentMonth, 12, 20, 30) },
            
            { title: 'Amazon Shopping', amount: 3999, type: 'expense', category: 'shopping', payment_mode: 'upi', created_at: new Date(currentYear, currentMonth, 15, 18, 20) },
            { title: 'Pharmacy', amount: 540, type: 'expense', category: 'health', payment_mode: 'cash', created_at: new Date(currentYear, currentMonth, 16, 10, 10) },
            { title: 'Phone Recharge', amount: 799, type: 'expense', category: 'bills', payment_mode: 'upi', created_at: new Date(currentYear, currentMonth, 18, 11, 45) },
            { title: 'Swiggy Lunch', amount: 350, type: 'expense', category: 'food', payment_mode: 'upi', created_at: new Date(currentYear, currentMonth, 19, 13, 15) },
        ];

        // Ensure proper references
        const recordsToInsert = mockData.map(data => ({
            ...data,
            userId,
        }));

        await Transaction.insertMany(recordsToInsert);
        console.log(`Successfully seeded ${recordsToInsert.length} transactions for analytics testing!`);
        
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
