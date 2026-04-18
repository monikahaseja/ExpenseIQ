const mongoose = require('mongoose');
const User = require('./models/User');
const AppName = require('./models/AppName');
const Budget = require('./models/Budget');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expenseiq';

const seedExistingData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find();
        console.log(`Found ${users.length} users. Checking missing appnames and budgets...`);

        const currentDate = new Date();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
        const year = currentDate.getFullYear();
        const currentMonthString = `${year}-${month}`;

        for (let user of users) {
             // AppName Seed
             let appName = await AppName.findOne({ userId: user._id });
             if (!appName) {
                  const defaultTitle = new AppName({ userId: user._id, name: '💰ExpenseIQ' });
                  await defaultTitle.save();
                  console.log(`Seeded default AppName for user: ${user.name}`);
             } else {
                  console.log(`User ${user.name} already has an AppName.`);
             }

             // Budget Seed
             let budget = await Budget.findOne({ userId: user._id, month: currentMonthString });
             if (!budget) {
                  const defaultBudget = new Budget({ userId: user._id, month: currentMonthString, amount: 5000 });
                  await defaultBudget.save();
                  console.log(`Seeded default Budget (5000) for user: ${user.name} for ${currentMonthString}`);
             } else {
                  console.log(`User ${user.name} already has a Budget for ${currentMonthString}.`);
             }
        }
        
        console.log(`Successfully finished seeding distinct tables!`);
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedExistingData();
