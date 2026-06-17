import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAllPostsWithDetails, savePost } from '../services/data';

const PostSaveContext = createContext();

export function PostSaveProvider({ children }) {
  const [savedMap, setSavedMap] = useState({});
  const [initialized, setInitialized] = useState(false);

  const syncAllPosts = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const posts = await getAllPostsWithDetails(userId);
      const newSavedMap = {};
      for (const p of posts) {
        newSavedMap[p.id] = p.saved;
      }
      setSavedMap(newSavedMap);
      setInitialized(true);
    } catch (e) {
      console.warn('Failed to sync saved posts:', e);
    }
  }, []);

  const toggleSave = useCallback(async (postId, userId, currentSaved) => {
    if (!postId || !userId) return currentSaved;
    
    const newSaved = !currentSaved;
    setSavedMap(prev => ({ ...prev, [postId]: newSaved }));
    
    return newSaved;
  }, []);

  const getSaveState = useCallback((postId) => {
    return savedMap[postId] ?? null;
  }, [savedMap]);

  return (
    <PostSaveContext.Provider value={{ 
      savedMap, 
      toggleSave, 
      getSaveState, 
      syncAllPosts,
      initialized 
    }}>
      {children}
    </PostSaveContext.Provider>
  );
}

export function usePostSave() {
  return useContext(PostSaveContext);
}
