import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Clock, ChevronRight, Award, GraduationCap, Briefcase, Users, Lightbulb, X, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createTip, getAllTips, deleteTip, addTipComment, getTipComments } from '../services/data';
import { formatTimeAgo } from '../utils/timeUtils';

function TipCard({ tip, liked, onLike, onDelete, onComment, currentUserId }) {
  const [showComments, setShowComments] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [commentText, setCommentText] = useState('');
  const categoryIcons = { Academic: GraduationCap, Career: Briefcase, Internships: Award, Networking: Users };
  const CategoryIcon = categoryIcons[tip.category] || GraduationCap;
  const isOwner = tip.author?.id === currentUserId;

  const handleComment = () => { if (!commentText.trim()) return; onComment(tip.id, commentText); setCommentText(''); };

  return (
    <article className="card p-4 sm:p-6 card-hover animate-fade-in relative">
      {isOwner && <button onClick={() => onDelete(tip.id)} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors group"><Trash2 className="w-4 h-4 text-slate-400 group-hover:text-rose-500" /></button>}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="badge flex items-center gap-1.5 text-[10px] sm:text-xs"><CategoryIcon className="w-3.5 h-3.5" />{tip.category}</span>
        <span className="text-xs text-slate-400">·</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{tip.readTime || '5 min read'}</span>
      </div>
      <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-3">{tip.title}</h2>
      <p className={`text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-4 ${showFull ? '' : 'line-clamp-3'}`}>{tip.content}</p>
      {tip.content.length > 150 && <button onClick={() => setShowFull(!showFull)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mb-4 font-medium">{showFull ? 'Show less' : 'Read more...'}</button>}
      <div className="flex items-center gap-3 mb-4">
        <img src={tip.author?.avatar} alt={tip.author?.name} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-white text-sm">{tip.author?.name}</span>
            {tip.author?.badges?.includes('Mentor') && <span className="badge text-[10px] bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">Mentor</span>}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{tip.author?.college} · {formatTimeAgo(tip.timestamp)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/50">
        <div className="flex items-center gap-4">
          <button onClick={() => onLike(tip.id)} className={`flex items-center gap-1.5 transition-all duration-200 ${liked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'}`}>
            <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
            <span className="text-xs font-semibold">{liked ? tip.likes + 1 : tip.likes}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-semibold">{tip.comments?.length || 0}</span>
          </button>
        </div>
        <button onClick={() => setShowFull(!showFull)} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium text-xs transition-colors">
          {showFull ? 'Less' : 'Read'} <ChevronRight className={`w-4 h-4 transition-transform ${showFull ? 'rotate-90' : ''}`} />
        </button>
      </div>
      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 animate-fade-in">
          <div className="flex gap-2 mb-3">
            <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleComment()} placeholder="Add a comment..." className="input-field flex-1 text-sm" />
            <button onClick={handleComment} disabled={!commentText.trim()} className="btn-primary px-3 disabled:opacity-40"><Send className="w-4 h-4" /></button>
          </div>
          {tip.comments && tip.comments.length > 0 ? (
            <div className="space-y-3">
              {tip.comments.map((c, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <img src={c.avatar} alt="" className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700" />
                  <div className="flex-1 min-w-0 bg-[#f8f6f3] dark:bg-[#0e1322]/60 rounded-xl px-3.5 py-2.5">
                    <div className="flex items-center gap-2"><span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.name}</span><span className="text-[10px] text-slate-400 font-medium">{formatTimeAgo(c.timestamp)}</span></div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400 text-center py-2">No comments yet</p>}
        </div>
      )}
    </article>
  );
}

function EmptyTips() {
  return (
    <div className="card p-8 sm:p-12 text-center animate-slide-up">
      <div className="w-16 h-16 rounded-2xl bg-[#f3f1ed] dark:bg-[#0e1322] flex items-center justify-center mx-auto mb-4 animate-float"><Lightbulb className="w-8 h-8 text-slate-400" /></div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No tips yet</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">Share your experiences and help freshers navigate college life!</p>
    </div>
  );
}

export default function MentorHub() {
  const { user } = useAuth();
  const [tips, setTips] = useState([]);
  const [likedTips, setLikedTips] = useState({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [tipForm, setTipForm] = useState({ title: '', content: '', category: '' });
  const [loading, setLoading] = useState(true);

  const categories = [
    { name: 'All', icon: Users, color: 'from-slate-500 to-slate-600' },
    { name: 'Academic', icon: GraduationCap, color: 'from-blue-500 to-blue-600' },
    { name: 'Career', icon: Briefcase, color: 'from-emerald-500 to-emerald-600' },
    { name: 'Internships', icon: Award, color: 'from-amber-500 to-amber-600' },
    { name: 'Networking', icon: Users, color: 'from-purple-500 to-purple-600' },
  ];

  useEffect(() => {
    const load = async () => {
      try { 
        const t = await getAllTips();
        const enriched = await Promise.all(t.map(async (tip) => {
          const comments = await getTipComments(tip.id);
          return { ...tip, comments };
        }));
        setTips(enriched);
      } catch (e) { console.warn('Failed to load tips:', e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleLike = (tipId) => setLikedTips(prev => ({ ...prev, [tipId]: !prev[tipId] }));

  const handleDelete = async (tipId) => {
    try { await deleteTip(tipId); setTips(prev => prev.filter(t => t.id !== tipId)); } catch (e) { console.error('Failed to delete tip:', e); }
  };

  const handleComment = async (tipId, text) => {
    try {
      await addTipComment(tipId, user.id, text);
      const comments = await getTipComments(tipId);
      setTips(prev => prev.map(t => t.id === tipId ? { ...t, comments } : t));
    } catch (e) { console.error('Failed to add comment:', e); }
  };

  const handleCreateTip = async () => {
    if (!tipForm.title.trim() || !tipForm.content.trim()) return;
    try {
      await createTip({
        title: tipForm.title, content: tipForm.content, category: tipForm.category || 'Academic',
        authorId: user.id, readTime: `${Math.max(1, Math.ceil(tipForm.content.split(' ').length / 200))} min read`,
      });
      const t = await getAllTips(); setTips(t);
    } catch (e) { console.error('Failed to create tip:', e); }
    setTipForm({ title: '', content: '', category: '' }); setShowCreate(false);
  };

  const filteredTips = activeCategory === 'All' ? tips : tips.filter(t => t.category === activeCategory);

  if (loading) return <div className="p-4 sm:p-8"><div className="card p-6 animate-pulse"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3" /></div></div>;

  return (
    <div className="p-4 sm:p-8 overflow-x-hidden">
      <div className="flex gap-2 sm:gap-4 mb-6 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:grid sm:grid-cols-5">
        {categories.map(cat => (
          <button key={cat.name} onClick={() => setActiveCategory(cat.name)} className={`card p-3 sm:p-5 cursor-pointer card-hover text-left transition-all duration-200 flex-shrink-0 w-24 sm:w-auto ${activeCategory === cat.name ? 'ring-2 ring-slate-400 dark:ring-slate-500' : ''}`}>
            <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-2 sm:mb-3`}><cat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" /></div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-base whitespace-nowrap">{cat.name}</h3>
          </button>
        ))}
      </div>

      <div className="card p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between">
          <div><h3 className="font-semibold text-slate-900 dark:text-white">Share Your Experience</h3><p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Help juniors with your tips and advice</p></div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm sm:text-base">{showCreate ? 'Cancel' : 'Write Tip'}</button>
        </div>
        {showCreate && (
          <div className="mt-6 pt-6 border-t space-y-4 animate-fade-in" style={{ borderColor: '#e8e5e0' }}>
            <input type="text" placeholder="Tip title" className="input-field" value={tipForm.title} onChange={(e) => setTipForm(p => ({ ...p, title: e.target.value }))} />
            <textarea placeholder="Share your advice..." className="input-field resize-none h-32" value={tipForm.content} onChange={(e) => setTipForm(p => ({ ...p, content: e.target.value }))} />
            <select className="input-field" value={tipForm.category} onChange={(e) => setTipForm(p => ({ ...p, category: e.target.value }))}><option value="">Select Category</option><option value="Academic">Academic</option><option value="Career">Career</option><option value="Internships">Internships</option><option value="Networking">Networking</option></select>
            <button onClick={handleCreateTip} disabled={!tipForm.title.trim() || !tipForm.content.trim()} className="btn-primary w-full disabled:opacity-50">Publish Tip</button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4 sm:space-y-6">
          {filteredTips.length === 0 ? <EmptyTips /> : filteredTips.map(tip => <TipCard key={tip.id} tip={tip} liked={likedTips[tip.id]} onLike={handleLike} onDelete={handleDelete} onComment={handleComment} currentUserId={user?.id} />)}
        </div>
      </div>
    </div>
  );
}