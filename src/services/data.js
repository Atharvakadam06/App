import { query, queryOne, execute, initDatabase as initTursoDb } from './turso';
import { getCurrentTimestamp } from '../utils/timeUtils';

let dbInitialized = false;

export async function initDatabase() {
  if (!dbInitialized) {
    try {
      await initTursoDb();
      console.log('Database initialized successfully');
    } catch (e) {
      console.warn('Database connection failed:', e);
    }
    dbInitialized = true;
  }
}

async function ensureDb() {
  if (!dbInitialized) {
    await initDatabase();
  }
}

// ---- Users ----
export async function createUser(user) {
  await ensureDb();
  await execute(
    `INSERT INTO users (id, name, username, email, avatar, bio, college, branch, year, badges, joined_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [user.id, user.name, user.username, user.email, user.avatar, user.bio || '', user.college || '', user.branch || '', user.year || '', JSON.stringify(user.badges || ['New Member']), user.joinedDate || new Date().getFullYear().toString()]
  );
}

export async function getUser(userId) {
  await ensureDb();
  const row = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  return row ? formatUser(row) : null;
}

export async function getUserByEmail(email) {
  await ensureDb();
  const row = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
  return row ? formatUser(row) : null;
}

export async function getUserByUsername(username) {
  await ensureDb();
  const row = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
  return row ? formatUser(row) : null;
}

export async function getAllUsers() {
  await ensureDb();
  const rows = await query('SELECT * FROM users ORDER BY created_at DESC');
  return rows.map(formatUser);
}

export async function updateUser(userId, updates) {
  await ensureDb();
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key === 'joinedDate' ? 'joined_date' : key === 'coverPhoto' ? 'cover_photo' : key;
    if (key === 'badges') {
      fields.push(`${dbKey} = ?`);
      values.push(JSON.stringify(value));
    } else {
      fields.push(`${dbKey} = ?`);
      values.push(value);
    }
  }
  values.push(userId);
  await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteUser(userId) {
  await ensureDb();
  await execute('DELETE FROM users WHERE id = ?', [userId]);
}

function formatUser(row) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    avatar: row.avatar,
    bio: row.bio,
    college: row.college,
    branch: row.branch,
    year: row.year,
    coverPhoto: row.cover_photo,
    badges: JSON.parse(row.badges || '[]'),
    connections: row.connections,
    resources: row.resources,
    joinedDate: row.joined_date,
  };
}

// ---- Posts ----
export async function createPost(post) {
  const id = post.id || Date.now().toString();
  const timestamp = post.timestamp || getCurrentTimestamp();
  console.log('Creating post with timestamp:', timestamp);
  
  try {
await ensureDb();
    await execute(
      `INSERT INTO posts (id, user_id, content, image, video, likes, shares, tags, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, post.userId, post.content, post.image || null, post.video || null, post.likes || 0, post.shares || 0, JSON.stringify(post.tags || []), timestamp]
    );
    return id;
  } catch (e) {
    console.error('createPost failed:', e);
    throw e;
  }
}

export async function getAllPosts() {
  try {
    await ensureDb();
    const rows = await query('SELECT * FROM posts ORDER BY created_at DESC');
    const posts = [];
    for (const row of rows) {
      try {
        let user = null;
        try {
          user = await getUser(row.user_id);
        } catch (e) {
          user = { id: row.user_id, name: 'Unknown User', avatar: '' };
        }
        const comments = await getPostComments(row.id);
        posts.push({
          id: row.id,
          userId: row.user_id,
          user,
          content: row.content,
          image: row.image,
          video: row.video,
          likes: row.likes,
          shares: row.shares,
          tags: JSON.parse(row.tags || '[]'),
          timestamp: row.timestamp,
          comments,
        });
      } catch (rowErr) {
        console.warn('Skipping post due to error:', row.id, rowErr);
      }
    }
    return posts;
  } catch (e) {
    console.error('getAllPosts failed:', e);
    return [];
  }
}

export async function deletePost(postId) {
  await ensureDb();
  await execute('DELETE FROM posts WHERE id = ?', [postId]);
}

export async function updatePost(postId, content) {
  await ensureDb();
  await execute('UPDATE posts SET content = ?, updated_at = ? WHERE id = ?', [content, new Date().toISOString(), postId]);
}

export async function likePost(postId, userId) {
  await ensureDb();
  const existing = await queryOne('SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
  if (existing) {
    await execute('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    await execute('UPDATE posts SET likes = likes - 1 WHERE id = ?', [postId]);
    return false;
  } else {
    await execute('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
    await execute('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId]);
    return true;
  }
}

export async function isPostLiked(postId, userId) {
  await ensureDb();
  const row = await queryOne('SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
  return !!row;
}

export async function savePost(postId, userId) {
  await ensureDb();
  const existing = await queryOne('SELECT * FROM post_saves WHERE post_id = ? AND user_id = ?', [postId, userId]);
  if (existing) {
    await execute('DELETE FROM post_saves WHERE post_id = ? AND user_id = ?', [postId, userId]);
    return false;
  } else {
    await execute('INSERT INTO post_saves (post_id, user_id) VALUES (?, ?)', [postId, userId]);
    return true;
  }
}

export async function isPostSaved(postId, userId) {
  await ensureDb();
  const row = await queryOne('SELECT * FROM post_saves WHERE post_id = ? AND user_id = ?', [postId, userId]);
  return !!row;
}

export async function getPostComments(postId) {
  await ensureDb();
  const rows = await query('SELECT c.*, u.name, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC', [postId]);
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    avatar: r.avatar,
    text: r.text,
    timestamp: r.timestamp,
  }));
}

export async function addComment(postId, userId, text) {
  await ensureDb();
  const id = Date.now().toString();
  await execute(
    'INSERT INTO comments (id, post_id, user_id, text, timestamp) VALUES (?, ?, ?, ?, ?)',
    [id, postId, userId, text, getCurrentTimestamp()]
  );
  return id;
}

// ---- Papers ----
export async function createPaper(paper) {
  await ensureDb();
  const id = paper.id || Date.now().toString();
  await execute(
    `INSERT INTO papers (id, title, subject, semester, year, college, uploaded_by, downloads, rating, file_size, file_name, file_type, file_url, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, paper.title, paper.subject || 'General', paper.semester || 'N/A', paper.year || '', paper.college || '', paper.uploadedBy, paper.downloads || 0, paper.rating || 0, paper.fileSize || '', paper.fileName || '', paper.fileType || '', paper.fileUrl || null, JSON.stringify(paper.tags || [])]
  );
  return id;
}

export async function getAllPapers() {
  await ensureDb();
  const rows = await query('SELECT p.*, u.name as uploader_name, u.avatar as uploader_avatar, u.college as uploader_college FROM papers p JOIN users u ON p.uploaded_by = u.id ORDER BY p.created_at DESC');
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    subject: r.subject,
    semester: r.semester,
    year: r.year,
    college: r.college,
    uploadedBy: { id: r.uploaded_by, name: r.uploader_name, avatar: r.uploader_avatar },
    downloads: r.downloads,
    rating: r.rating,
    fileSize: r.file_size,
    fileName: r.file_name,
    fileType: r.file_type,
    fileUrl: r.file_url,
    tags: JSON.parse(r.tags || '[]'),
  }));
}

export async function incrementPaperDownloads(paperId) {
  await ensureDb();
  await execute('UPDATE papers SET downloads = downloads + 1 WHERE id = ?', [paperId]);
}

export async function deletePaper(paperId) {
  await ensureDb();
  await execute('DELETE FROM papers WHERE id = ?', [paperId]);
}

// ---- Books ----
export async function createBook(book) {
  await ensureDb();
  const id = book.id || Date.now().toString();
  await execute(
    `INSERT INTO books (id, title, author, subject, price, uploaded_by, available, image, description, file_url, file_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, book.title, book.author, book.subject || 'General', book.price || 'Free', book.uploadedBy, book.available ? 1 : 0, book.image || null, book.description || '', book.fileUrl || null, book.fileName || null]
  );
  return id;
}

export async function getAllBooks() {
  await ensureDb();
  const rows = await query('SELECT b.*, u.name as uploader_name, u.avatar as uploader_avatar, u.college as uploader_college FROM books b JOIN users u ON b.uploaded_by = u.id ORDER BY b.created_at DESC');
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    author: r.author,
    subject: r.subject,
    price: r.price,
    uploadedBy: { id: r.uploaded_by, name: r.uploader_name, avatar: r.uploader_avatar, college: r.uploader_college },
    available: r.available === 1,
    image: r.image,
    description: r.description,
    fileUrl: r.file_url,
    fileName: r.file_name,
  }));
}

export async function deleteBook(bookId) {
  await ensureDb();
  await execute('DELETE FROM books WHERE id = ?', [bookId]);
}

// ---- Tips ----
export async function createTip(tip) {
  await ensureDb();
  const id = tip.id || Date.now().toString();
  await execute(
    `INSERT INTO tips (id, title, content, category, author_id, likes, read_time, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tip.title, tip.content, tip.category || 'Academic', tip.authorId, tip.likes || 0, tip.readTime || '5 min read', tip.timestamp || getCurrentTimestamp()]
  );
  return id;
}

export async function getAllTips() {
  await ensureDb();
  const rows = await query('SELECT t.*, u.name, u.username, u.avatar, u.college, u.badges FROM tips t JOIN users u ON t.author_id = u.id ORDER BY t.created_at DESC');
  const tips = [];
  for (const r of rows) {
    const comments = await getTipComments(r.id);
    tips.push({
      id: r.id,
      title: r.title,
      content: r.content,
      category: r.category,
      author: { id: r.author_id, name: r.name, username: r.username, avatar: r.avatar, college: r.college, badges: JSON.parse(r.badges || '[]') },
      likes: r.likes,
      readTime: r.read_time,
      timestamp: r.timestamp,
      comments,
    });
  }
  return tips;
}

export async function deleteTip(tipId) {
  await ensureDb();
  await execute('DELETE FROM tips WHERE id = ?', [tipId]);
}

export async function getTipComments(tipId) {
  await ensureDb();
  const rows = await query('SELECT tc.*, u.name, u.avatar FROM tip_comments tc JOIN users u ON tc.user_id = u.id WHERE tc.tip_id = ? ORDER BY tc.created_at ASC', [tipId]);
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    avatar: r.avatar,
    text: r.text,
    timestamp: r.timestamp,
  }));
}

export async function addTipComment(tipId, userId, text) {
  await ensureDb();
  const id = Date.now().toString();
  await execute(
    'INSERT INTO tip_comments (id, tip_id, user_id, text) VALUES (?, ?, ?, ?)',
    [id, tipId, userId, text]
  );
  return id;
}

// ---- Links (Network) ----
export async function toggleLink(userId, linkedUserId) {
  await ensureDb();
  const existing = await queryOne('SELECT * FROM links WHERE user_id = ? AND linked_user_id = ?', [userId, linkedUserId]);
  if (existing) {
    await execute('DELETE FROM links WHERE user_id = ? AND linked_user_id = ?', [userId, linkedUserId]);
    await execute('DELETE FROM links WHERE user_id = ? AND linked_user_id = ?', [linkedUserId, userId]);
    await execute('UPDATE users SET connections = connections - 1 WHERE id = ?', [userId]);
    await execute('UPDATE users SET connections = connections - 1 WHERE id = ?', [linkedUserId]);
    return false;
  } else {
    await execute('INSERT INTO links (user_id, linked_user_id) VALUES (?, ?)', [userId, linkedUserId]);
    await execute('INSERT INTO links (user_id, linked_user_id) VALUES (?, ?)', [linkedUserId, userId]);
    await execute('UPDATE users SET connections = connections + 1 WHERE id = ?', [userId]);
    await execute('UPDATE users SET connections = connections + 1 WHERE id = ?', [linkedUserId]);
    return true;
  }
}

export async function getLinks(userId) {
  await ensureDb();
  const rows = await query('SELECT linked_user_id FROM links WHERE user_id = ?', [userId]);
  const links = {};
  for (const r of rows) {
    links[r.linked_user_id] = true;
  }
  return links;
}

// ---- Conversations & Messages ----
export async function getConversations(userId) {
  await ensureDb();
  const rows = await query(
    `SELECT c.*,
      CASE WHEN c.user1_id = ? THEN c.unread_user2 ELSE c.unread_user1 END as unread,
      CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END as other_user_id
     FROM conversations c
     WHERE c.user1_id = ? OR c.user2_id = ?
     ORDER BY c.created_at DESC`,
    [userId, userId, userId, userId]
  );
  const convs = [];
  for (const r of rows) {
    const otherUser = await getUser(r.other_user_id);
    convs.push({
      id: r.id,
      user: otherUser,
      lastMessage: r.last_message,
      timestamp: r.timestamp,
      unread: r.unread,
    });
  }
  return convs;
}

export async function getMessages(conversationId) {
  await ensureDb();
  const rows = await query('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId]);
  return rows.map(r => ({
    id: r.id,
    senderId: r.sender_id,
    content: r.content,
    file: r.file_url,
    fileName: r.file_name,
    fileType: r.file_type,
    timestamp: r.timestamp,
  }));
}

export async function sendMessage(conversationId, senderId, content, fileUrl = null, fileName = null, fileType = null) {
  await ensureDb();
  const msgId = Date.now().toString();
  const timestamp = getCurrentTimestamp();
  await execute(
    'INSERT INTO messages (id, conversation_id, sender_id, content, file_url, file_name, file_type, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [msgId, conversationId, senderId, content, fileUrl, fileName, fileType, timestamp]
  );
  const lastMsg = fileUrl ? (fileType?.startsWith('image/') ? 'Photo' : `File: ${fileName}`) : content;
  await execute(
    'UPDATE conversations SET last_message = ?, timestamp = ? WHERE id = ?',
    [lastMsg, timestamp, conversationId]
  );
  return msgId;
}

export async function createConversation(user1Id, user2Id) {
  await ensureDb();
  const existing = await queryOne(
    'SELECT * FROM conversations WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
    [user1Id, user2Id, user2Id, user1Id]
  );
  if (existing) return existing.id;
  const id = Date.now().toString();
  await execute(
    'INSERT INTO conversations (id, user1_id, user2_id) VALUES (?, ?, ?)',
    [id, user1Id, user2Id]
  );
  return id;
}

// ---- Notifications ----
export async function addNotification(userId, type, message) {
  await ensureDb();
  const id = Date.now().toString() + Math.random();
  await execute(
    'INSERT INTO notifications (id, user_id, type, message, timestamp) VALUES (?, ?, ?, ?, ?)',
    [id, userId, type, message, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })]
  );
  return id;
}

export async function getNotifications(userId) {
  await ensureDb();
  const rows = await query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    type: r.type,
    message: r.message,
    read: r.read === 1,
    timestamp: r.timestamp,
  }));
}

export async function markNotificationRead(notifId) {
  await ensureDb();
  await execute('UPDATE notifications SET read = 1 WHERE id = ?', [notifId]);
}

export async function markAllNotificationsRead(userId) {
  await ensureDb();
  await execute('UPDATE notifications SET read = 1 WHERE user_id = ?', [userId]);
}

export async function deleteNotification(notifId) {
  await ensureDb();
  await execute('DELETE FROM notifications WHERE id = ?', [notifId]);
}

export async function clearAllNotifications(userId) {
  await ensureDb();
  await execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
}

// ---- Seed Demo Users ----
export async function seedDemoUsers() {
  await ensureDb();
  const demoUsers = [
    {
      id: 'demo_alice',
      name: 'Alice Sharma',
      username: 'alice.sharma',
      email: 'alice@college.ac.in',
      avatar: 'https://ui-avatars.com/api/?name=Alice+Sharma&background=334155&color=fff&size=150',
      bio: 'CS student passionate about web development and open source.',
      college: 'IIT Bombay',
      branch: 'Computer Science',
      year: '3rd Year',
      badges: ['New Member', 'Top Contributor'],
      joinedDate: '2024',
    },
    {
      id: 'demo_bob',
      name: 'Bob Patel',
      username: 'bob.patel',
      email: 'bob@college.ac.in',
      avatar: 'https://ui-avatars.com/api/?name=Bob+Patel&background=334155&color=fff&size=150',
      bio: 'Electronics enthusiast. Love building circuits and coding.',
      college: 'NIT Trichy',
      branch: 'Electronics',
      year: '2nd Year',
      badges: ['New Member'],
      joinedDate: '2024',
    },
  ];
  for (const user of demoUsers) {
    const existing = await getUser(user.id);
    if (!existing) {
      await createUser(user);
    }
  }
}

// ---- Clear All Data ----
export async function clearAllData() {
  await ensureDb();
  await execute('DELETE FROM post_likes');
  await execute('DELETE FROM post_saves');
  await execute('DELETE FROM comments');
  await execute('DELETE FROM tip_comments');
  await execute('DELETE FROM messages');
  await execute('DELETE FROM conversations');
  await execute('DELETE FROM notifications');
  await execute('DELETE FROM links');
  await execute('DELETE FROM blocked_users');
  await execute('DELETE FROM reports');
  await execute('DELETE FROM papers');
  await execute('DELETE FROM books');
  await execute('DELETE FROM tips');
  await execute('DELETE FROM posts');
}

// ---- Blocked Users ----
export async function blockUser(userId, blockedUserId) {
  await ensureDb();
  const existing = await queryOne('SELECT * FROM blocked_users WHERE user_id = ? AND blocked_id = ?', [userId, blockedUserId]);
  if (!existing) {
    await execute('INSERT INTO blocked_users (user_id, blocked_id) VALUES (?, ?)', [userId, blockedUserId]);
  }
}

export async function unblockUser(userId, blockedUserId) {
  await ensureDb();
  await execute('DELETE FROM blocked_users WHERE user_id = ? AND blocked_id = ?', [userId, blockedUserId]);
}

export async function getBlockedUsers(userId) {
  await ensureDb();
  const rows = await query('SELECT blocked_id FROM blocked_users WHERE user_id = ?', [userId]);
  return rows.map(r => r.blocked_id);
}

// ---- Reports ----
export async function createReport(reporterId, contentId, contentType, reason) {
  await ensureDb();
  await execute('INSERT INTO reports (reporter_id, content_id, content_type, reason, created_at) VALUES (?, ?, ?, ?, ?)', 
    [reporterId, contentId, contentType, reason, new Date().toISOString()]);
}

// ---- Export Data ----
export async function exportUserData(userId) {
  await ensureDb();
  const user = await getUser(userId);
  const posts = await query('SELECT * FROM posts WHERE user_id = ?', [userId]);
  const comments = await query('SELECT * FROM comments WHERE user_id = ?', [userId]);
  const likedPosts = await query('SELECT post_id FROM post_likes WHERE user_id = ?', [userId]);
  const savedPosts = await query('SELECT post_id FROM post_saves WHERE user_id = ?', [userId]);
  const links = await query('SELECT linked_user_id FROM links WHERE user_id = ? AND is_linked = 1', [userId]);
  
  return {
    profile: user,
    posts,
    comments,
    likedPosts: likedPosts.map(l => l.post_id),
    savedPosts: savedPosts.map(s => s.post_id),
    connections: links.map(l => l.linked_user_id),
    exportedAt: new Date().toISOString()
  };
}