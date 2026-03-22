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
