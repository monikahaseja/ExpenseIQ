import { openDatabaseSync, SQLiteDatabase } from "expo-sqlite";

export const db: SQLiteDatabase = openDatabaseSync("expenses.db");

export const initDB = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      amount REAL,
      type TEXT DEFAULT 'expense', -- 'income' or 'expense'
      created_at TEXT,
      updated_at TEXT
    );
  `);
  
  // Migration to add columns if they don't exist
  try {
    await db.execAsync("ALTER TABLE expenses ADD COLUMN created_at TEXT;");
  } catch (e) {
    // Column likely already exists
  }
  
  try {
    await db.execAsync("ALTER TABLE expenses ADD COLUMN updated_at TEXT;");
  } catch (e) {}

  try {
    await db.execAsync("ALTER TABLE expenses ADD COLUMN type TEXT DEFAULT 'expense';");
  } catch (e) {}

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS budgets (
      month TEXT PRIMARY KEY,
      amount REAL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TEXT
    );
  `);

  // Migration: add is_read column if it doesn't exist
  try {
    await db.execAsync("ALTER TABLE notifications ADD COLUMN is_read INTEGER DEFAULT 0;");
  } catch (e) {
    // Column likely already exists
  }
};

export const getSetting = async (key: string): Promise<string | null> => {
  try {
    const result = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = ?;", [key]);
    return result ? result.value : null;
  } catch (e) {
    return null;
  }
};

export const saveSetting = async (key: string, value: string) => {
  try {
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);",
      [key, value]
    );
  } catch (e) {
    console.error("Error saving setting:", e);
  }
};

export const getBudget = async (month: string): Promise<number> => {
  try {
    const result = await db.getFirstAsync<{ amount: number }>("SELECT amount FROM budgets WHERE month = ?;", [month]);
    return result ? result.amount : 0;
  } catch (e) {
    return 0;
  }
};

export const saveBudget = async (month: string, amount: number) => {
  try {
    await db.runAsync(
      "INSERT OR REPLACE INTO budgets (month, amount) VALUES (?, ?);",
      [month, amount]
    );
  } catch (e) {
    console.error("Error saving budget:", e);
  }
};

export interface NotificationRecord {
  id: number;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

export const saveNotification = async (message: string, type: string) => {
  try {
    const now = new Date().toISOString();
    await db.runAsync(
      "INSERT INTO notifications (message, type, is_read, created_at) VALUES (?, ?, 0, ?);",
      [message, type, now],
    );
  } catch (e) {
    console.error("Error saving notification:", e);
  }
};

export const getNotifications = async (): Promise<NotificationRecord[]> => {
  try {
    return await db.getAllAsync<NotificationRecord>(
      "SELECT * FROM notifications ORDER BY id DESC;",
    );
  } catch (e) {
    return [];
  }
};

export const deleteNotification = async (id: number) => {
  try {
    await db.runAsync("DELETE FROM notifications WHERE id = ?;", [id]);
  } catch (e) {
    console.error("Error deleting notification:", e);
  }
};

export const clearAllNotifications = async () => {
  try {
    await db.runAsync("DELETE FROM notifications;");
  } catch (e) {
    console.error("Error clearing notifications:", e);
  }
};

export const getUnreadCount = async (): Promise<number> => {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM notifications WHERE is_read = 0;",
    );
    return result ? result.count : 0;
  } catch (e) {
    return 0;
  }
};

export const markAsRead = async (id: number) => {
  try {
    await db.runAsync("UPDATE notifications SET is_read = 1 WHERE id = ?;", [id]);
  } catch (e) {
    console.error("Error marking notification as read:", e);
  }
};

export const markAllAsRead = async () => {
  try {
    await db.runAsync("UPDATE notifications SET is_read = 1;");
  } catch (e) {
    console.error("Error marking all notifications as read:", e);
  }
};
