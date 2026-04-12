# ExpenseIQ Project Overview & Verification Guide

This project is now a full-stack application with a **Node.js/Express** backend and an **Expo (React Native)** frontend.

## Project Structure
- **/backend**: Node.js server with MongoDB, JWT Authentication, and User-specific data storage.
- **/frontend**: Expo project with Login, Signup, and Profile flows.

---

## How to Check Functionality

### 1. Backend Setup
1. Navigate to `/backend`.
2. Run `npm install`.
3. Create a `.env` file (one is already provided) with:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/expenseiq
   JWT_SECRET=your_jwt_secret
   ```
4. Start the server: `npm start` or `node server.js`.

### 2. Frontend Setup
1. Navigate to `/frontend`.
2. Run `npm install`.
3. Start the app: `npx expo start`.

### 3. Verification Flow
1. **Signup**: Open the app. You should be redirected to the Login screen. Click "Sign Up" and create a new account.
2. **Login**: After signing up, you will be automatically logged in. Try logging out from the **Profile** tab and logging back in.
3. **Add Expense**: Add a new transaction (Income/Expense). It will be saved locally in SQLite and synchronized with the MongoDB backend under your User ID.
4. **Data Isolation**: Create a second account. Verify that you cannot see the transactions created by the first account.
5. **Profile**: Check the Profile tab to see your account details and use the Logout button.

---

## API Testing with Postman

### Base URL: `http://localhost:5000/api`

### 1. Authentication
- **Signup**: 
  - `POST /auth/signup`
  - Body (JSON): `{ "name": "User Name", "email": "user@example.com", "password": "password123" }`
- **Login**:
  - `POST /auth/login`
  - Body (JSON): `{ "email": "user@example.com", "password": "password123" }`
  - **Copy the `token` from the response.**

### 2. Expenses (Authenticated)
*Note: In Postman, go to the **Auth** tab, select **Bearer Token**, and paste the token.*

- **Get All Expenses**:
  - `GET /expenses`
- **Add Expense**:
  - `POST /expenses`
  - Body (JSON): 
    ```json
    {
      "title": "Starbucks Coffee",
      "amount": 150,
      "type": "expense",
      "category": "food",
      "payment_mode": "card"
    }
    ```
- **Delete Expense**:
  - `DELETE /expenses/:id` (Replace `:id` with the MongoDB `_id` from the list response)

### 3. Profile
- `GET /auth/profile` (Requires Bearer Token)

---

## Expected Outputs
- **Auth**: On success, returns a `token` and `user` object.
- **Expenses**: Returns an array of expenses or the newly created expense object including the `userId`.
- **Validation**: Attempting to access `/api/expenses` without a token should return a `401 Unauthorized`.
