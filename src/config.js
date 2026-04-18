export const TURSO_CONFIG = {
  url: import.meta.env.VITE_TURSO_DATABASE_URL || 'libsql://stugrow-anonymous111.aws-ap-south-1.turso.io',
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzUxNTYzMDMsImlkIjoiMDE5ZDRmOGUtOTgwMS03ZjdjLWJjMmUtZjMwNDI0ZjdlMzY0IiwicmlkIjoiMGU2OTUxZWMtMGIyZS00MDliLTgxZGItYzY3YWFlNDhmYTVkIn0.pGf4qTkXhdDiKxuYkXSTKMDB7bW3nxJMvfhyiCMeP-0iQeoQ3Pm0I-E9RSSgi9Ez5u_5XxhaGgJZvro0dsTrAw',
};

export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};