import { createClient } from '@libsql/client';
import { TURSO_CONFIG } from '../config';

let client = null;
let dbInitialized = false;

function getClient() {
  if (!client && TURSO_CONFIG.url && TURSO_CONFIG.authToken) {
    client = createClient({
      url: TURSO_CONFIG.url,
      authToken: TURSO_CONFIG.authToken,
    });
  }
  return client;
}

export async function initDatabase() {
  if (dbInitialized) return;
  
  const db = getClient();
  if (!db) {
    console.warn('Turso not configured, using fallback');
    dbInitialized = true;
    return;
  }

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        avatar TEXT,
        bio TEXT,
        college TEXT,
        branch TEXT,
        year TEXT,
        badges TEXT DEFAULT '[]',
        connections INTEGER DEFAULT 0,
        resources INTEGER DEFAULT 0,
        cover_photo TEXT,
        joined_date TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT,
        image TEXT,
        video TEXT,
        category TEXT DEFAULT 'general',
        likes INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]',
        timestamp TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    try {
      await db.execute(`ALTER TABLE posts ADD COLUMN category TEXT DEFAULT 'general'`);
    } catch (e) {
      // Column may already exist
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS post_likes (
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        PRIMARY KEY (post_id, user_id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS post_saves (
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        PRIMARY KEY (post_id, user_id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        text TEXT,
        timestamp TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS papers (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subject TEXT,
        semester TEXT,
        year TEXT,
        college TEXT,
        uploaded_by TEXT NOT NULL,
        downloads INTEGER DEFAULT 0,
        rating INTEGER DEFAULT 0,
        file_size TEXT,
        file_name TEXT,
        file_type TEXT,
        file_url TEXT,
        tags TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT,
        subject TEXT,
        condition TEXT,
        price TEXT,
        uploaded_by TEXT NOT NULL,
        available INTEGER DEFAULT 1,
        image TEXT,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS tips (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        category TEXT,
        author_id TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        read_time TEXT,
        timestamp TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS tip_comments (
        id TEXT PRIMARY KEY,
        tip_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        text TEXT,
        timestamp TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS links (
        user_id TEXT NOT NULL,
        linked_user_id TEXT NOT NULL,
        PRIMARY KEY (user_id, linked_user_id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user1_id TEXT NOT NULL,
        user2_id TEXT NOT NULL,
        last_message TEXT,
        timestamp TEXT,
        unread_user1 INTEGER DEFAULT 0,
        unread_user2 INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT,
        file_url TEXT,
        file_name TEXT,
        file_type TEXT,
        timestamp TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT,
        message TEXT,
        read INTEGER DEFAULT 0,
        timestamp TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        user_id TEXT NOT NULL,
        blocked_id TEXT NOT NULL,
        PRIMARY KEY (user_id, blocked_id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL,
        content_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        reason TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS post_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT
      )
    `);

    dbInitialized = true;
    console.log('Turso database initialized');
  } catch (e) {
    console.error('Failed to initialize Turso database:', e);
    dbInitialized = true;
  }
}

export async function execute(sql, args = []) {
  const db = getClient();
  if (!db) {
    throw new Error('Turso not configured');
  }
  return db.execute(sql, args);
}

export async function query(sql, args = []) {
  const db = getClient();
  if (!db) {
    throw new Error('Turso not configured');
  }
  const result = await db.execute(sql, args);
  return result.rows || [];
}

export async function queryOne(sql, args = []) {
  const rows = await query(sql, args);
  return rows[0] || null;
}

export async function executeMany(statements) {
  const db = getClient();
  if (!db) {
    throw new Error('Turso not configured');
  }
  for (const s of statements) {
    await db.execute(s.sql, s.args || []);
  }
}

export default { query, queryOne, execute, executeMany, initDatabase };