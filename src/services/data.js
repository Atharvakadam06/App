import { query, queryOne, execute, initDatabase as initTursoDb } from './turso';
import { getCurrentTimestamp } from '../utils/timeUtils';

let dbInitialized = false;
let dbInitError = null;
let serverTimeOffset = 0;

export async function initDatabase() {
  if (dbInitialized) return;
  if (dbInitError) throw dbInitError;

  try {
    await initTursoDb();
    console.log('Database initialized successfully');
    dbInitialized = true;
  } catch (e) {
    dbInitError = e;
    console.error('Database init failed:', e);
    throw e;
  }
}

export async function ensureDb() {
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
    [
      user.id,
      user.name,
      user.username,
      user.email,
      user.avatar,
      user.bio || '',
      user.college || '',
      user.branch || '',
      user.year || '',
      JSON.stringify(user.badges || ['New Member']),
      user.joinedDate || new Date().getFullYear().toString(),
    ]
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

// ---- Local Fallback (works even if Turso is down) ----
const FALLBACK_POSTS_KEY = 'stugrow_posts_fallback';

function loadFallbackPosts() {
  try { return JSON.parse(localStorage.getItem(FALLBACK_POSTS_KEY)) || []; }
  catch { return []; }
}

// ---- Posts ----
export async function createPost(post) {
  const record = {
    id: post.id || Date.now().toString(),
    user_id: post.userId,
    content: typeof post.content === 'string' ? post.content.trim() : '',
    image: typeof post.image === 'string' && post.image.trim() ? post.image.trim() : null,
    video: typeof post.video === 'string' && post.video.trim() ? post.video.trim() : null,
    category: typeof post.category === 'string' ? post.category : 'general',
    file_url: typeof post.file_url === 'string' && post.file_url.trim() ? post.file_url.trim() : null,
    file_name: typeof post.file_name === 'string' && post.file_name.trim() ? post.file_name.trim() : null,
    likes: post.likes || 0,
    shares: post.shares || 0,
    tags: Array.isArray(post.tags) ? post.tags : [],
    timestamp: post.timestamp || getCurrentTimestamp(),
    created_at: getCurrentTimestamp(),
    user: post.user || null,
  };

  console.log('createPost called with image:', record.image ? record.image.substring(0, 50) + '...' : 'null', 'file:', record.file_name);

  // Always save to localStorage fallback so posts are visible even if DB is down
  const fallback = loadFallbackPosts();
  fallback.unshift(record);
  try {
    localStorage.setItem(FALLBACK_POSTS_KEY, JSON.stringify(fallback));
    console.log('Saved to localStorage, total posts:', fallback.length);
  } catch (e) {
    console.warn('localStorage fallback write failed:', e);
  }

  // Try Turso if available
  try {
    await ensureDb();
    await execute(
      `INSERT INTO posts (id, user_id, content, image, video, category, likes, shares, tags, timestamp, file_url, file_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [record.id, record.user_id, record.content, record.image, record.video, record.category, record.likes, record.shares, JSON.stringify(record.tags), record.timestamp, record.file_url, record.file_name]
    );
  } catch (e) {
    console.warn('Turso write failed, using localStorage only:', e);
  }

  return record.id;
}

export async function getAllPosts() {
  const posts = [];
  const dbPostsMap = new Map();

  // Try to query Turso data first if available
  try {
    await ensureDb();
    const rows = await query(`
      SELECT 
        p.*, 
        u.name as user_name, 
        u.avatar as user_avatar, 
        u.college as user_college, 
        u.username as user_username,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as real_likes
      FROM posts p 
      LEFT JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC
    `);
    for (const row of rows) {
      const likesCount = row.real_likes !== undefined && row.real_likes !== null ? Number(row.real_likes) : (row.likes ?? 0);
      const p = {
        id: row.id,
        userId: row.user_id,
        user: { id: row.user_id, name: row.user_name, avatar: row.user_avatar, college: row.user_college, username: row.user_username },
        content: row.content || '',
        image: row.image,
        video: row.video,
        category: row.category || 'general',
        file_url: row.file_url || null,
        file_name: row.file_name || null,
        likes: likesCount,
        shares: row.shares ?? 0,
        tags: JSON.parse(row.tags || '[]'),
        timestamp: row.timestamp,
        comments: [],
        liked: false,
        saved: false,
      };
      posts.push(p);
      dbPostsMap.set(row.id, p);
    }
  } catch (e) {
    console.warn('Turso read failed for posts, falling back to localStorage only:', e);
  }

  // Load fallback posts from localStorage for offline support / newly created posts not yet synced
  try {
    const fallback = loadFallbackPosts();
    for (const p of fallback) {
      const id = p.id || p.postId;
      if (!dbPostsMap.has(id)) {
        posts.push({
          id: id,
          userId: p.user_id || p.userId,
          user: p.user || null,
          content: p.content || '',
          image: p.image || null,
          video: p.video || null,
          category: p.category || 'general',
          file_url: p.file_url || null,
          file_name: p.file_name || null,
          likes: p.likes ?? 0,
          shares: p.shares ?? 0,
          tags: p.tags || [],
          timestamp: p.timestamp || p.created_at,
          comments: [],
          liked: false,
          saved: false,
        });
      }
    }
  } catch (e) {
    console.warn('Failed to load fallback posts from localStorage:', e);
  }

  // Sort all posts chronologically by timestamp (newest first)
  posts.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime() || 0;
    const timeB = new Date(b.timestamp).getTime() || 0;
    return timeB - timeA;
  });

  return posts;
}

export async function getAllPostsWithDetails(userId) {
  const posts = await getAllPosts();
  try {
    await ensureDb();
    const enriched = await Promise.all(posts.map(async (p) => {
      let comments = [];
      let liked = false;
      let saved = false;

      try {
        comments = await getPostComments(p.id);
      } catch (e) {
        console.warn(`Failed to fetch comments for post ${p.id}:`, e);
      }

      if (userId) {
        try {
          const likeRow = await queryOne('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?', [p.id, userId]);
          liked = !!likeRow;
        } catch (e) {
          console.warn(`Failed to fetch like status for post ${p.id}:`, e);
        }

        try {
          const saveRow = await queryOne('SELECT 1 FROM post_saves WHERE post_id = ? AND user_id = ?', [p.id, userId]);
          saved = !!saveRow;
        } catch (e) {
          console.warn(`Failed to fetch save status for post ${p.id}:`, e);
        }
      }

      let userData = p.user;
      if (!userData && p.userId) {
        try {
          const u = await getUser(p.userId);
          if (u) {
            userData = { id: u.id, name: u.name, avatar: u.avatar, college: u.college };
          }
        } catch (e) {
          console.warn(`Failed to fetch user details for post ${p.id}:`, e);
        }
      }

      return {
        ...p,
        user: userData,
        liked,
        saved,
        likes: p.likes ?? 0,
        comments
      };
    }));
    return enriched;
  } catch (dbError) {
    console.warn('Database error in getAllPostsWithDetails, falling back:', dbError);
    return posts.map(p => ({
      ...p,
      comments: [],
      liked: false,
      saved: false
    }));
  }
}


export async function deletePost(postId) {
   const fallback = loadFallbackPosts();
   const filtered = fallback.filter(p => p.id !== postId);
   localStorage.setItem(FALLBACK_POSTS_KEY, JSON.stringify(filtered));
   try {
     await ensureDb();
     await execute('DELETE FROM posts WHERE id = ?', [postId]);
   } catch (e) {
     console.warn('Turso delete failed:', e);
   }
 }

export async function updatePost(postId, content) {
   const fallback = loadFallbackPosts();
   const updated = fallback.map(p => p.id === postId ? { ...p, content } : p);
   localStorage.setItem(FALLBACK_POSTS_KEY, JSON.stringify(updated));
   try {
     await ensureDb();
     await execute('UPDATE posts SET content = ?, updated_at = ? WHERE id = ?', [content, new Date().toISOString(), postId]);
   } catch (e) {
     console.warn('Turso update failed:', e);
   }
 }

export async function likePost(postId, userId) {
  await ensureDb();
  const existing = await queryOne('SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
  if (existing) {
    await execute('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    await execute('UPDATE posts SET likes = likes - 1 WHERE id = ?', [postId]);
    // Keep localStorage fallback in sync
    try {
      const fallback = loadFallbackPosts();
      const updated = fallback.map(p => p.id === postId ? { ...p, likes: Math.max(0, (p.likes || 0) - 1) } : p);
      localStorage.setItem(FALLBACK_POSTS_KEY, JSON.stringify(updated));
    } catch (e) { /* ignore */ }
    return false;
  }
  await execute('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  await execute('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId]);
  // Keep localStorage fallback in sync
  try {
    const fallback = loadFallbackPosts();
    const updated = fallback.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p);
    localStorage.setItem(FALLBACK_POSTS_KEY, JSON.stringify(updated));
  } catch (e) { /* ignore */ }
  return true;
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
  }
  await execute('INSERT INTO post_saves (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  return true;
}

export async function isPostSaved(postId, userId) {
  await ensureDb();
  const row = await queryOne('SELECT * FROM post_saves WHERE post_id = ? AND user_id = ?', [postId, userId]);
  return !!row;
}

export async function getPostComments(postId) {
  await ensureDb();
  const rows = await query('SELECT c.*, u.name, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE post_id = ? ORDER BY created_at ASC', [postId]);
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    avatar: r.avatar,
    text: r.text,
    timestamp: r.timestamp,
    parentId: r.parent_id || null,
  }));
}

export async function addComment(postId, userId, text, parentId = null) {
  await ensureDb();
  const id = Date.now().toString();
  await execute(
    'INSERT INTO comments (id, post_id, user_id, text, timestamp, parent_id) VALUES (?, ?, ?, ?, ?, ?)',
    [id, postId, userId, text, getCurrentTimestamp(), parentId]
  );
  return id;
}

export async function deleteComment(commentId) {
  await ensureDb();
  await execute('DELETE FROM comments WHERE id = ?', [commentId]);
}

// ---- Papers ----
const FALLBACK_PAPERS_KEY = 'stugrow_papers_fallback';

function loadFallbackPapers() {
  try { return JSON.parse(localStorage.getItem(FALLBACK_PAPERS_KEY)) || []; }
  catch { return []; }
}

export async function createPaper(paper) {
  const record = {
    id: paper.id || Date.now().toString(),
    title: paper.title,
    subject: paper.subject || 'General',
    semester: paper.semester || 'N/A',
    year: paper.year || '',
    college: paper.college || '',
    uploadedBy: paper.uploadedBy,
    downloads: paper.downloads || 0,
    rating: paper.rating || 0,
    fileSize: paper.fileSize || '',
    fileName: paper.fileName || '',
    fileType: paper.fileType || '',
    fileUrl: paper.fileUrl || null,
    tags: paper.tags || [],
    createdAt: getCurrentTimestamp(),
  };

  console.log('createPaper called:', record.title, record.fileName);

  const fallback = loadFallbackPapers();
  fallback.unshift(record);
  try {
    localStorage.setItem(FALLBACK_PAPERS_KEY, JSON.stringify(fallback));
  } catch (e) {
    console.warn('localStorage fallback write failed:', e);
  }

  try {
    await ensureDb();
    await execute(
      `INSERT INTO papers (id, title, subject, semester, year, college, uploaded_by, downloads, rating, file_size, file_name, file_type, file_url, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.title,
        record.subject,
        record.semester,
        record.year,
        record.college,
        record.uploadedBy,
        record.downloads,
        record.rating,
        record.fileSize,
        record.fileName,
        record.fileType,
        record.fileUrl,
        JSON.stringify(record.tags),
      ]
    );
  } catch (e) {
    console.warn('Turso write failed for paper, using localStorage only:', e);
  }
  return record.id;
}

export async function getAllPapers() {
  const papers = [];
  const dbPapersMap = new Map();

  // Try to query Turso data first if available
  try {
    await ensureDb();
    const rows = await query('SELECT p.*, u.name as uploader_name, u.avatar as uploader_avatar, u.college as uploader_college FROM papers p JOIN users u ON p.uploaded_by = u.id ORDER BY p.created_at DESC');
    for (const r of rows) {
      const paper = {
        id: r.id,
        title: r.title,
        subject: r.subject,
        semester: r.semester,
        year: r.year,
        college: r.college,
        uploadedBy: { id: r.uploader_by, name: r.uploader_name, avatar: r.uploader_avatar },
        downloads: r.downloads,
        rating: r.rating,
        fileSize: r.file_size,
        fileName: r.file_name,
        fileType: r.file_type,
        fileUrl: r.file_url,
        tags: JSON.parse(r.tags || '[]'),
        createdAt: r.created_at,
      };
      papers.push(paper);
      dbPapersMap.set(r.id, paper);
    }
  } catch (e) {
    console.warn('Turso read failed for papers, using localStorage only:', e);
  }

  // Load fallback papers from localStorage
  try {
    const fallback = loadFallbackPapers();
    for (const p of fallback) {
      if (!dbPapersMap.has(p.id)) {
        papers.push({
          id: p.id,
          title: p.title,
          subject: p.subject,
          semester: p.semester,
          year: p.year,
          college: p.college,
          uploadedBy: { id: p.uploadedBy, name: '', avatar: '' },
          downloads: p.downloads,
          rating: p.rating,
          fileSize: p.fileSize,
          fileName: p.fileName,
          fileType: p.fileType,
          fileUrl: p.fileUrl,
          tags: p.tags || [],
          createdAt: p.createdAt || p.created_at,
        });
      }
    }
  } catch (e) {
    console.warn('Failed to load fallback papers:', e);
  }

  // Sort papers by createdAt descending
  papers.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime() || 0;
    const timeB = new Date(b.createdAt).getTime() || 0;
    return timeB - timeA;
  });

  return papers;
}

export async function incrementPaperDownloads(paperId) {
  await ensureDb();
  await execute('UPDATE papers SET downloads = downloads + 1 WHERE id = ?', [paperId]);
}

export async function deletePaper(paperId) {
  const fallback = loadFallbackPapers();
  const filtered = fallback.filter(p => p.id !== paperId);
  localStorage.setItem(FALLBACK_PAPERS_KEY, JSON.stringify(filtered));
  try {
    await ensureDb();
    await execute('DELETE FROM papers WHERE id = ?', [paperId]);
  } catch (e) {
    console.warn('Turso delete failed for paper:', e);
  }
}

const FALLBACK_BOOKS_KEY = 'stugrow_books_fallback';

function loadFallbackBooks() {
  try { return JSON.parse(localStorage.getItem(FALLBACK_BOOKS_KEY)) || []; }
  catch { return []; }
}

// ---- Books ----
export async function createBook(book) {
  const record = {
    id: book.id || Date.now().toString(),
    title: book.title,
    author: book.author,
    subject: book.subject || 'General',
    price: book.price || 'Free',
    uploadedBy: book.uploadedBy,
    available: book.available ? 1 : 0,
    image: book.image || null,
    description: book.description || '',
    fileUrl: book.fileUrl || null,
    fileName: book.fileName || null,
    downloads: 0,
    createdAt: getCurrentTimestamp(),
  };

  console.log('createBook called with file:', record.fileName);

  const fallback = loadFallbackBooks();
  fallback.unshift(record);
  try {
    localStorage.setItem(FALLBACK_BOOKS_KEY, JSON.stringify(fallback));
    console.log('Saved book to localStorage, total:', fallback.length);
  } catch (e) {
    console.warn('localStorage fallback write failed:', e);
  }

  try {
    await ensureDb();
    await execute(
      `INSERT INTO books (id, title, author, subject, price, uploaded_by, available, image, description, file_url, file_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.title,
        record.author,
        record.subject,
        record.price,
        record.uploadedBy,
        record.available,
        record.image,
        record.description,
        record.fileUrl,
        record.fileName,
      ]
    );
  } catch (e) {
    console.warn('Turso write failed for book, using localStorage only:', e);
  }
  return record.id;
}

export async function getAllBooks() {
  const books = [];
  const dbBooksMap = new Map();

  // Try to query Turso data first if available
  try {
    await ensureDb();
    const rows = await query('SELECT b.*, u.name as uploader_name, u.avatar as uploader_avatar, u.college as uploader_college FROM books b JOIN users u ON b.uploaded_by = u.id ORDER BY b.created_at DESC');
    for (const r of rows) {
      const book = {
        id: r.id,
        title: r.title,
        author: r.author,
        subject: r.subject,
        price: r.price,
        uploadedBy: { id: r.uploader_by, name: r.uploader_name, avatar: r.uploader_avatar, college: r.uploader_college },
        available: r.available === 1,
        image: r.image,
        description: r.description,
        fileUrl: r.file_url,
        fileName: r.file_name,
        createdAt: r.created_at,
      };
      books.push(book);
      dbBooksMap.set(r.id, book);
    }
  } catch (e) {
    console.warn('Turso read failed for books, using localStorage only:', e);
  }

  // Load fallback books from localStorage
  try {
    const fallback = loadFallbackBooks();
    for (const b of fallback) {
      if (!dbBooksMap.has(b.id)) {
        books.push({
          id: b.id,
          title: b.title,
          author: b.author,
          subject: b.subject,
          price: b.price,
          uploadedBy: { id: b.uploadedBy, name: '', avatar: '', college: '' },
          available: b.available === 1,
          image: b.image,
          description: b.description,
          fileUrl: b.fileUrl,
          fileName: b.fileName,
          createdAt: b.createdAt || b.created_at,
        });
      }
    }
  } catch (e) {
    console.warn('Failed to load fallback books:', e);
  }

  // Sort books by createdAt descending
  books.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime() || 0;
    const timeB = new Date(b.createdAt).getTime() || 0;
    return timeB - timeA;
  });

  return books;
}

export async function deleteBook(bookId) {
  const fallback = loadFallbackBooks();
  const filtered = fallback.filter(b => b.id !== bookId);
  localStorage.setItem(FALLBACK_BOOKS_KEY, JSON.stringify(filtered));
  try {
    await ensureDb();
    await execute('DELETE FROM books WHERE id = ?', [bookId]);
  } catch (e) {
    console.warn('Turso delete failed for book:', e);
  }
}

// ---- Products (Marketplace) ----
const FALLBACK_PRODUCTS_KEY = 'stugrow_products_fallback';

function loadFallbackProducts() {
  try { return JSON.parse(localStorage.getItem(FALLBACK_PRODUCTS_KEY)) || []; }
  catch { return []; }
}

export async function createProduct(product) {
  const record = {
    id: product.id || Date.now().toString(),
    title: product.title,
    description: product.description || '',
    price: Number(product.price) || 0,
    category: product.category || 'Other',
    condition: product.condition || 'Good',
    image: product.image || null,
    sellerId: product.sellerId,
    contactInfo: product.contactInfo || '',
    status: product.status || 'available',
    createdAt: getCurrentTimestamp(),
  };

  const fallback = loadFallbackProducts();
  fallback.unshift(record);
  try {
    localStorage.setItem(FALLBACK_PRODUCTS_KEY, JSON.stringify(fallback));
  } catch (e) {
    console.warn('localStorage products fallback write failed:', e);
  }

  try {
    await ensureDb();
    await execute(
      `INSERT INTO products (id, title, description, price, category, condition, image, seller_id, contact_info, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.title,
        record.description,
        record.price,
        record.category,
        record.condition,
        record.image,
        record.sellerId,
        record.contactInfo,
        record.status,
      ]
    );
  } catch (e) {
    console.warn('Turso write failed for product, using localStorage fallback only:', e);
  }
  return record.id;
}

export async function getAllProducts() {
  const products = [];
  const dbProductsMap = new Map();

  // Try to query Turso data first if available
  try {
    await ensureDb();
    const rows = await query('SELECT p.*, u.name as seller_name, u.avatar as seller_avatar, u.college as seller_college, u.username as seller_username FROM products p JOIN users u ON p.seller_id = u.id ORDER BY p.created_at DESC');
    for (const r of rows) {
      const product = {
        id: r.id,
        title: r.title,
        description: r.description,
        price: r.price,
        category: r.category,
        condition: r.condition,
        image: r.image,
        sellerId: r.seller_id,
        seller: { id: r.seller_id, name: r.seller_name, avatar: r.seller_avatar, college: r.seller_college, username: r.seller_username },
        contactInfo: r.contact_info,
        status: r.status,
        createdAt: r.created_at,
      };
      products.push(product);
      dbProductsMap.set(r.id, product);
    }
  } catch (e) {
    console.warn('Turso read failed for products, using localStorage fallback:', e);
  }

  // Load fallback products from localStorage
  try {
    const fallback = loadFallbackProducts();
    for (const p of fallback) {
      if (!dbProductsMap.has(p.id)) {
        products.push({
          id: p.id,
          title: p.title,
          description: p.description,
          price: p.price,
          category: p.category,
          condition: p.condition,
          image: p.image,
          sellerId: p.sellerId,
          seller: { id: p.sellerId, name: 'Student', avatar: 'https://ui-avatars.com/api/?name=Student&background=334155&color=fff' },
          contactInfo: p.contactInfo,
          status: p.status,
          createdAt: p.createdAt || p.created_at,
        });
      }
    }
  } catch (e) {
    console.warn('Failed to load fallback products:', e);
  }

  // Sort products by createdAt descending
  products.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime() || 0;
    const timeB = new Date(b.createdAt).getTime() || 0;
    return timeB - timeA;
  });

  for (const p of products) {
    if (p.seller.name === 'Student') {
      try {
        const u = await getUser(p.sellerId);
        if (u) {
          p.seller = { id: u.id, name: u.name, avatar: u.avatar, college: u.college, username: u.username };
        }
      } catch (e) {
        // ignore
      }
    }
  }

  return products;
}

export async function deleteProduct(productId) {
  const fallback = loadFallbackProducts();
  const filtered = fallback.filter(p => p.id !== productId);
  localStorage.setItem(FALLBACK_PRODUCTS_KEY, JSON.stringify(filtered));
  try {
    await ensureDb();
    await execute('DELETE FROM products WHERE id = ?', [productId]);
  } catch (e) {
    console.warn('Turso delete failed for product:', e);
  }
}

export async function updateProductStatus(productId, status) {
  const fallback = loadFallbackProducts();
  const updated = fallback.map(p => p.id === productId ? { ...p, status } : p);
  localStorage.setItem(FALLBACK_PRODUCTS_KEY, JSON.stringify(updated));
  try {
    await ensureDb();
    await execute('UPDATE products SET status = ? WHERE id = ?', [status, productId]);
  } catch (e) {
    console.warn('Turso update failed for product:', e);
  }
}

// ---- Tips ----
export async function createTip(tip) {
  await ensureDb();
  const id = tip.id || Date.now().toString();
  await execute(
    `INSERT INTO tips (id, title, content, category, author_id, likes, read_time, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tip.title,
      tip.content,
      tip.category || 'Academic',
      tip.authorId,
      tip.likes || 0,
      tip.readTime || '5 min read',
      tip.timestamp || getCurrentTimestamp(),
    ]
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
  const rows = await query('SELECT tc.*, u.name, u.avatar FROM tip_comments tc JOIN users u ON tc.user_id = u.id WHERE tip_id = ? ORDER tc.created_at ASC', [tipId]);
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
  }
  await execute('INSERT INTO links (user_id, linked_user_id) VALUES (?, ?)', [userId, linkedUserId]);
  await execute('INSERT INTO links (user_id, linked_user_id) VALUES (?, ?)', [linkedUserId, userId]);
  await execute('UPDATE users SET connections = connections + 1 WHERE id = ?', [userId]);
  await execute('UPDATE users SET connections = connections + 1 WHERE id = ?', [linkedUserId]);
  return true;
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
    WHERE c.user1_id = ? OR c.user2_id = ?`,
    [userId, userId, userId, userId]
  );
  
  // Get all deleted message IDs for this user
  const deletedIds = await getDeletedMessageIds(userId).catch(() => []);
  const deletedSet = new Set(deletedIds);

  const convs = [];
  for (const r of rows) {
    const otherUser = await getUser(r.other_user_id);
    
    // Find the latest message in this conversation that is NOT deleted for everyone
    const messages = await query(
      `SELECT * FROM messages 
       WHERE conversation_id = ? 
         AND content != '🚫 This message was deleted'
       ORDER BY created_at DESC`,
      [r.id]
    );

    // Filter out messages deleted for me (using deletedSet)
    const visibleMessages = messages.filter(m => !deletedSet.has(m.id));

    let lastMsgText = r.last_message;
    let lastMsgTimestamp = r.timestamp;

    if (visibleMessages.length > 0) {
      const latest = visibleMessages[0];
      lastMsgText = latest.file_url 
        ? (latest.file_type?.startsWith('image/') ? 'Photo' : `File: ${latest.file_name}`)
        : latest.content;
      lastMsgTimestamp = latest.timestamp;
    } else {
      // If no visible messages left in the thread, set to empty
      lastMsgText = '';
    }

    const unreadCount = visibleMessages.filter(m => m.sender_id !== userId && (m.read === 0 || !m.read)).length;

    convs.push({
      id: r.id,
      user: otherUser,
      lastMessage: lastMsgText,
      timestamp: lastMsgTimestamp,
      unread: unreadCount,
    });
  }

  // Sort conversations by latest active timestamp descending (newest first)
  convs.sort((a, b) => {
    const tA = new Date(a.timestamp).getTime() || 0;
    const tB = new Date(b.timestamp).getTime() || 0;
    return tB - tA;
  });

  return convs;
}

export async function getMessages(conversationId) {
  await ensureDb();
  const rows = await query('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId]);
  const messages = rows.map(r => ({
    id: r.id,
    senderId: r.sender_id,
    content: r.content,
    file: r.file_url,
    fileName: r.file_name,
    fileType: r.file_type,
    parentId: r.parent_id,
    timestamp: r.timestamp,
    read: r.read ?? 0,
  }));

  if (messages.length > 0) {
    const ids = messages.map(m => m.id);
    const reactionsMap = await getReactionsForMessages(ids);
    for (const m of messages) {
      m.reactions = reactionsMap[m.id] || [];
    }
  }

  return messages;
}

export async function markMessagesAsRead(conversationId, userId) {
  await ensureDb();
  await execute('UPDATE messages SET read = 1 WHERE conversation_id = ? AND sender_id != ? AND read = 0', [conversationId, userId]);
}

export async function sendMessage(conversationId, senderId, content, fileUrl = null, fileName = null, fileType = null, parentId = null) {
  await ensureDb();
  const msgId = Date.now().toString();
  const timestamp = getCurrentTimestamp();
  await execute(
    'INSERT INTO messages (id, conversation_id, sender_id, content, file_url, file_name, file_type, parent_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [msgId, conversationId, senderId, content, fileUrl, fileName, fileType, parentId, timestamp]
  );
  const lastMsg = fileUrl ? (fileType?.startsWith('image/') ? 'Photo' : `File: ${fileName}`) : content;
  await execute('UPDATE conversations SET last_message = ?, timestamp = ? WHERE id = ?', [lastMsg, timestamp, conversationId]);
  return msgId;
}

export async function deleteMessageEveryone(messageId) {
  await ensureDb();
  await execute("UPDATE messages SET content = '🚫 This message was deleted', file_url = null, file_name = null, file_type = null WHERE id = ?", [messageId]);
}

export async function editMessage(messageId, newContent) {
  await ensureDb();
  await execute('UPDATE messages SET content = ? WHERE id = ?', [newContent, messageId]);
}

export async function updateUserLastActive(userId, timestamp = undefined) {
  if (!userId) return;
  await ensureDb();
  if (timestamp === null) {
    await execute('UPDATE users SET last_active = NULL WHERE id = ?', [userId]);
  } else if (timestamp === undefined) {
    await execute("UPDATE users SET last_active = strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now') WHERE id = ?", [userId]);
  } else {
    await execute('UPDATE users SET last_active = ? WHERE id = ?', [timestamp, userId]);
  }
}

export async function setTypingStatus(conversationId, userId, isTyping) {
  await ensureDb();
  if (isTyping) {
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO typing_status (conversation_id, user_id, last_typed_at)
       VALUES (?, ?, ?)
       ON CONFLICT(conversation_id, user_id) DO UPDATE SET last_typed_at = ?`,
      [conversationId, userId, now, now]
    );
  } else {
    await execute(
      `DELETE FROM typing_status WHERE conversation_id = ? AND user_id = ?`,
      [conversationId, userId]
    );
  }
}

export async function getTypingStatus(conversationId, otherUserId) {
  await ensureDb();
  const row = await queryOne(
    `SELECT * FROM typing_status WHERE conversation_id = ? AND user_id = ?`,
    [conversationId, otherUserId]
  );
  if (!row) return false;
  const lastTyped = new Date(row.last_typed_at).getTime() || 0;
  const now = Date.now();
  return (now - lastTyped) < 4000;
}


export async function createConversation(user1Id, user2Id) {
  await ensureDb();
  const existing = await queryOne(
    'SELECT * FROM conversations WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
    [user1Id, user2Id, user2Id, user1Id]
  );
  if (existing) return existing.id;
  const id = Date.now().toString();
  await execute('INSERT INTO conversations (id, user1_id, user2_id) VALUES (?, ?, ?)', [id, user1Id, user2Id]);
  return id;
}

// ---- Notifications ----
export async function addNotification(userId, type, message) {
  await ensureDb();
  const id = Date.now().toString() + Math.random().toString(36).slice(2);
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
  await execute('DELETE FROM products');
  await execute('DELETE FROM tips');
  await execute('DELETE FROM posts');
  await execute('DELETE FROM message_reactions');
  try { localStorage.removeItem(FALLBACK_POSTS_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(FALLBACK_PRODUCTS_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem('stugrow_reactions_fallback'); } catch { /* ignore */ }
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
  await execute(
    'INSERT INTO reports (reporter_id, content_id, content_type, reason, created_at) VALUES (?, ?, ?, ?, ?)',
    [reporterId, contentId, contentType, reason, new Date().toISOString()]
  );
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
    exportedAt: new Date().toISOString(),
  };
}

// ---- Global Chat ----
const FALLBACK_GLOBAL_MESSAGES_KEY = 'stugrow_global_messages_fallback';

function loadFallbackGlobalMessages() {
  try { return JSON.parse(localStorage.getItem(FALLBACK_GLOBAL_MESSAGES_KEY)) || []; }
  catch { return []; }
}

export async function getGlobalMessages() {
  const messages = [];

  const fallback = loadFallbackGlobalMessages();
  for (const m of fallback) {
    const sender = await getUser(m.senderId);
    messages.push({
      id: m.id,
      senderId: m.senderId,
      sender: sender || { id: m.senderId, name: 'Student', avatar: 'https://ui-avatars.com/api/?name=Student&background=334155&color=fff' },
      content: m.content,
      file: m.fileUrl,
      fileName: m.fileName,
      fileType: m.fileType,
      parentId: m.parentId,
      timestamp: m.timestamp,
    });
  }

  try {
    await ensureDb();
    const rows = await query('SELECT gm.*, u.name as sender_name, u.avatar as sender_avatar, u.college as sender_college, u.username as sender_username FROM global_messages gm JOIN users u ON gm.sender_id = u.id ORDER BY gm.created_at ASC');
    const existingIds = new Set(messages.map(m => m.id));
    for (const r of rows) {
      if (!existingIds.has(r.id)) {
        messages.push({
          id: r.id,
          senderId: r.sender_id,
          sender: { id: r.sender_id, name: r.sender_name, avatar: r.sender_avatar, college: r.sender_college, username: r.sender_username },
          content: r.content,
          file: r.file_url,
          fileName: r.file_name,
          fileType: r.file_type,
          parentId: r.parent_id,
          timestamp: r.timestamp,
        });
      }
    }
  } catch (e) {
    console.warn('Turso read failed for global messages, using localStorage fallback:', e);
  }

  if (messages.length > 0) {
    const ids = messages.map(m => m.id);
    const reactionsMap = await getReactionsForMessages(ids);
    for (const m of messages) {
      m.reactions = reactionsMap[m.id] || [];
    }
  }

  return messages;
}

export async function sendGlobalMessage(senderId, content, fileUrl = null, fileName = null, fileType = null, parentId = null) {
  const timestamp = getCurrentTimestamp();
  const record = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    senderId,
    content,
    fileUrl,
    fileName,
    fileType,
    parentId,
    timestamp,
    createdAt: new Date().toISOString(),
  };

  const fallback = loadFallbackGlobalMessages();
  fallback.push(record);
  try {
    localStorage.setItem(FALLBACK_GLOBAL_MESSAGES_KEY, JSON.stringify(fallback));
  } catch (e) {
    console.warn('localStorage global messages write failed:', e);
  }

  try {
    await ensureDb();
    await execute(
      'INSERT INTO global_messages (id, sender_id, content, file_url, file_name, file_type, parent_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [record.id, senderId, content, fileUrl, fileName, fileType, parentId, timestamp]
    );
  } catch (e) {
    console.warn('Turso write failed for global message:', e);
  }
  return record.id;
}

export async function deleteGlobalMessageEveryone(messageId) {
  const fallback = loadFallbackGlobalMessages();
  const updated = fallback.map(m => m.id === messageId ? { ...m, content: '🚫 This message was deleted', fileUrl: null, fileName: null, fileType: null } : m);
  localStorage.setItem(FALLBACK_GLOBAL_MESSAGES_KEY, JSON.stringify(updated));

  try {
    await ensureDb();
    await execute("UPDATE global_messages SET content = '🚫 This message was deleted', file_url = null, file_name = null, file_type = null WHERE id = ?", [messageId]);
  } catch (e) {
    console.warn('Turso delete update failed for global message:', e);
  }
}

export async function editGlobalMessage(messageId, newContent) {
  const fallback = loadFallbackGlobalMessages();
  const updated = fallback.map(m => m.id === messageId ? { ...m, content: newContent } : m);
  localStorage.setItem(FALLBACK_GLOBAL_MESSAGES_KEY, JSON.stringify(updated));

  try {
    await ensureDb();
    await execute('UPDATE global_messages SET content = ? WHERE id = ?', [newContent, messageId]);
  } catch (e) {
    console.warn('Turso edit update failed for global message:', e);
  }
}


function formatUser(row) {
  let settings = { theme: 'light', notifications: { messages: true, connections: true, resources: false }, visibility: 'public' };
  try {
    if (row.settings) {
      settings = { ...settings, ...JSON.parse(row.settings) };
    }
  } catch (e) {
    console.warn('Failed to parse user settings:', e);
  }
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
    lastActive: row.last_active || null,
    settings,
  };
}

// ---- Calls ----
export async function createCall(conversationId, callerId, receiverId, type) {
  await ensureDb();
  const id = 'call_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  const roomName = 'stugrow-' + id;
  const timestamp = getCurrentTimestamp();
  await execute(
    `INSERT INTO calls (id, conversation_id, caller_id, receiver_id, type, status, room_name, timestamp)
     VALUES (?, ?, ?, ?, ?, 'ringing', ?, ?)`,
    [id, conversationId, callerId, receiverId, type, roomName, timestamp]
  );
  return { id, roomName };
}

export async function getActiveCall(conversationId) {
  await ensureDb();
  const row = await queryOne(
    `SELECT * FROM calls WHERE conversation_id = ? AND status NOT IN ('ended', 'rejected', 'missed')
     ORDER BY created_at DESC LIMIT 1`,
    [conversationId]
  );
  return row || null;
}

export async function getIncomingCall(userId) {
  await ensureDb();
  const row = await queryOne(
    `SELECT * FROM calls WHERE receiver_id = ? AND status = 'ringing'
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return row || null;
}

export async function updateCallStatus(callId, status) {
  await ensureDb();
  await execute(`UPDATE calls SET status = ? WHERE id = ?`, [status, callId]);
}

export async function setCallOffer(callId, sdpJson) {
  await ensureDb();
  await execute(`UPDATE calls SET offer = ? WHERE id = ?`, [sdpJson, callId]);
}

export async function setCallAnswer(callId, sdpJson) {
  await ensureDb();
  await execute(`UPDATE calls SET answer = ?, status = 'accepted' WHERE id = ?`, [sdpJson, callId]);
}

export async function getCallById(callId) {
  await ensureDb();
  const row = await queryOne(`SELECT * FROM calls WHERE id = ?`, [callId]);
  return row || null;
}

export async function deleteMessageForUser(userId, messageId) {
  if (!userId || !messageId) return;
  try {
    await ensureDb();
    await execute(
      'INSERT INTO user_deleted_messages (user_id, message_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
      [userId, messageId]
    );
  } catch (e) {
    console.warn('Failed to delete message for user in Turso:', e);
  }
}

export async function getDeletedMessageIds(userId) {
  if (!userId) return [];
  try {
    await ensureDb();
    const rows = await query('SELECT message_id FROM user_deleted_messages WHERE user_id = ?', [userId]);
    return rows.map(r => r.message_id);
  } catch (e) {
    console.warn('Failed to fetch deleted message IDs from Turso:', e);
    return [];
  }
}

export async function syncServerTime() {
  try {
    const start = Date.now();
    const row = await queryOne("SELECT strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now') as db_now");
    const end = Date.now();
    if (row && row.db_now) {
      const clientMean = (start + end) / 2;
      const dbTime = new Date(row.db_now).getTime();
      serverTimeOffset = dbTime - clientMean;
      console.log('Synced server time. Offset (db - client) ms:', serverTimeOffset);
    }
  } catch (e) {
    console.warn('Failed to sync server time:', e);
  }
}

export function isUserOnline(lastActive) {
  if (!lastActive) return false;
  const lastActiveTime = new Date(lastActive).getTime();
  if (isNaN(lastActiveTime)) return false;

  const adjustedNow = Date.now() + serverTimeOffset;
  const diff = adjustedNow - lastActiveTime;

  // Heartbeat is 4 seconds. Threshold is 15 seconds to allow for network jitter.
  return diff < 15000;
}

// ---- Message Reactions ----
export async function toggleMessageReaction(messageId, userId, reaction) {
  const fallbackReactionsKey = 'stugrow_reactions_fallback';
  let localReactions = [];
  try {
    localReactions = JSON.parse(localStorage.getItem(fallbackReactionsKey)) || [];
  } catch (e) {
    console.warn('Failed to parse fallback reactions:', e);
  }

  const existingLocalIdx = localReactions.findIndex(r => r.messageId === messageId && r.userId === userId);
  let localToggledOff = false;
  if (existingLocalIdx > -1) {
    if (localReactions[existingLocalIdx].reaction === reaction) {
      localReactions.splice(existingLocalIdx, 1);
      localToggledOff = true;
    } else {
      localReactions[existingLocalIdx].reaction = reaction;
    }
  } else {
    localReactions.push({ messageId, userId, reaction });
  }

  try {
    localStorage.setItem(fallbackReactionsKey, JSON.stringify(localReactions));
  } catch (e) {
    console.warn('Failed to save fallback reactions:', e);
  }

  // Sync to remote database
  try {
    await ensureDb();
    const existing = await queryOne('SELECT * FROM message_reactions WHERE message_id = ? AND user_id = ?', [messageId, userId]);
    if (existing) {
      if (existing.reaction === reaction) {
        await execute('DELETE FROM message_reactions WHERE message_id = ? AND user_id = ?', [messageId, userId]);
      } else {
        await execute('UPDATE message_reactions SET reaction = ? WHERE message_id = ? AND user_id = ?', [reaction, messageId, userId]);
      }
    } else {
      await execute('INSERT INTO message_reactions (message_id, user_id, reaction) VALUES (?, ?, ?)', [messageId, userId, reaction]);
    }
  } catch (e) {
    console.warn('Turso toggle reaction failed:', e);
  }

  return localToggledOff ? null : reaction;
}

export async function getReactionsForMessages(messageIds) {
  if (!messageIds || messageIds.length === 0) return {};
  
  const fallbackReactionsKey = 'stugrow_reactions_fallback';
  let localReactions = [];
  try {
    localReactions = JSON.parse(localStorage.getItem(fallbackReactionsKey)) || [];
  } catch (e) {
    // ignore
  }

  const map = {};
  for (const r of localReactions) {
    if (messageIds.includes(r.messageId)) {
      if (!map[r.messageId]) map[r.messageId] = [];
      map[r.messageId].push({ userId: r.userId, reaction: r.reaction });
    }
  }

  try {
    await ensureDb();
    const placeholders = messageIds.map(() => '?').join(',');
    const rows = await query(`SELECT * FROM message_reactions WHERE message_id IN (${placeholders})`, messageIds);
    
    const dbMap = {};
    for (const r of rows) {
      if (!dbMap[r.message_id]) dbMap[r.message_id] = {};
      dbMap[r.message_id][r.user_id] = r.reaction;
    }

    for (const msgId of messageIds) {
      const finalReactions = [];
      const userReactionMap = dbMap[msgId] || {};
      
      for (const [uId, react] of Object.entries(userReactionMap)) {
        finalReactions.push({ userId: uId, reaction: react });
      }

      const localForMsg = localReactions.filter(r => r.messageId === msgId);
      for (const lr of localForMsg) {
        if (!userReactionMap[lr.userId]) {
          finalReactions.push({ userId: lr.userId, reaction: lr.reaction });
        }
      }

      if (finalReactions.length > 0) {
        map[msgId] = finalReactions;
      }
    }
  } catch (e) {
    console.warn('Turso fetch reactions failed, using localStorage fallback:', e);
  }

  return map;
}
