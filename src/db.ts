import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('database.sqlite');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    mobile TEXT UNIQUE,
    reputation INTEGER DEFAULT 0,
    is_pro INTEGER DEFAULT 0,
    avatar TEXT
  );

  CREATE TABLE IF NOT EXISTS stocks (
    symbol TEXT PRIMARY KEY,
    name TEXT,
    price REAL,
    change_percent REAL,
    volume REAL,
    heat_score REAL DEFAULT 0,
    market TEXT, -- 'A' or 'HK'
    industry TEXT
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_symbol TEXT,
    content TEXT,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    is_hidden INTEGER DEFAULT 0,
    FOREIGN KEY(stock_symbol) REFERENCES stocks(symbol)
  );

  CREATE TABLE IF NOT EXISTS danmaku (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_symbol TEXT,
    user_id INTEGER,
    content TEXT,
    timestamp INTEGER,
    likes INTEGER DEFAULT 0,
    FOREIGN KEY(stock_symbol) REFERENCES stocks(symbol),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    stock_symbol TEXT,
    direction INTEGER, -- 1 for bull, -1 for bear
    status TEXT DEFAULT 'pending', -- pending, win, loss
    created_at INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(stock_symbol) REFERENCES stocks(symbol)
  );

  CREATE TABLE IF NOT EXISTS watchlist (
    user_id INTEGER,
    stock_symbol TEXT,
    PRIMARY KEY (user_id, stock_symbol),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(stock_symbol) REFERENCES stocks(symbol)
  );
`);

// Seed some data if empty
const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  db.prepare('INSERT INTO users (username, mobile, reputation, is_pro) VALUES (?, ?, ?, ?)').run('Admin', '13800138000', 1000, 1);
  
  const initialStocks = [
    ['700.HK', '腾讯控股', 380.5, 1.2, 5000000, 85, 'HK', '互联网'],
    ['9988.HK', '阿里巴巴', 75.2, -0.5, 8000000, 70, 'HK', '互联网'],
    ['3690.HK', '美团', 120.4, 2.1, 4000000, 92, 'HK', '互联网'],
    ['600519.SH', '贵州茅台', 1650.0, 0.8, 100000, 88, 'A', '消费'],
    ['000651.SZ', '格力电器', 35.2, 0.3, 2000000, 65, 'A', '家电'],
    ['601318.SH', '中国平安', 45.8, -1.2, 3000000, 75, 'A', '金融'],
    ['002594.SZ', '比亚迪', 220.5, 3.5, 1500000, 95, 'A', '汽车'],
    ['600036.SH', '招商银行', 32.4, 0.5, 4000000, 80, 'A', '金融'],
    ['000001.SZ', '平安银行', 10.2, 0.1, 5000000, 60, 'A', '金融'],
  ];

  const insertStock = db.prepare('INSERT INTO stocks (symbol, name, price, change_percent, volume, heat_score, market, industry) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  initialStocks.forEach(s => insertStock.run(...s));

  const initialTags = [
    ['700.HK', '回购', 10, 0],
    ['700.HK', '游戏增长', 8, 0],
    ['002594.SZ', '电车销冠', 15, 0],
    ['002594.SZ', '出海加速', 12, 0],
  ];
  const insertTag = db.prepare('INSERT INTO tags (stock_symbol, content, likes, dislikes) VALUES (?, ?, ?, ?)');
  initialTags.forEach(t => insertTag.run(...t));
}

export default db;
