import { useState, useEffect, useRef } from 'react';
import { BookOpen, MessageCircle, Check, Plus, X, Inbox, Upload, Trash2, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { branches } from '../data/mockData';
import { uploadToCloudinary } from '../services/cloudinary';
import { createBook, getAllBooks, deleteBook } from '../services/data';
import CustomSelect from '../components/CustomSelect';
import ProfessionalSearch from '../components/ProfessionalSearch';

function BookCard({ book, requested, onRequest, onDelete, currentUserId }) {
  const isOwner = book.uploadedBy?.id === currentUserId;
  return (
    <div className="card overflow-hidden card-hover animate-fade-in relative">
      {isOwner && <button onClick={() => onDelete(book.id)} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/80 dark:bg-slate-900/80 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors group"><Trash2 className="w-4 h-4 text-slate-400 group-hover:text-rose-500" /></button>}
      {book.image ? (
        <div className="aspect-[3/4] bg-[#f3f1ed] dark:bg-[#0e1322] relative overflow-hidden">
          <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
          <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${book.available ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'}`}>{book.available ? 'Available' : 'Claimed'}</div>
        </div>
      ) : (
        <div className="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center relative">
          <BookOpen className="w-12 h-12 text-slate-400" />
          <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${book.available ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'}`}>{book.available ? 'Available' : 'Claimed'}</div>
        </div>
      )}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-1 line-clamp-1 text-sm sm:text-base">{book.title}</h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-2">{book.author}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
          {book.subject && <span className="badge text-[10px]">{book.subject}</span>}
          {book.condition && <span className="badge text-[10px]">{book.condition}</span>}
        </div>
        {book.description && <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3 sm:mb-4">{book.description}</p>}
        {book.uploadedBy && (
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <img src={book.uploadedBy.avatar} alt="" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{book.uploadedBy.name}</p>
              {book.uploadedBy.college && <p className="text-[10px] text-slate-500 dark:text-slate-400">{book.uploadedBy.college}</p>}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">{book.price || 'Free'}</span>
          {book.available ? (
            <button onClick={() => onRequest(book.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${requested ? 'bg-[#f3f1ed] dark:bg-[#0e1322] text-slate-600 dark:text-slate-400' : 'btn-primary'}`}>
              {requested ? <><Check className="w-4 h-4" /><span>Requested</span></> : <><MessageCircle className="w-4 h-4" /><span>Request</span></>}
            </button>
          ) : <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500">Not available</span>}
        </div>
      </div>
    </div>
  );
}

function EmptyBooks() {
  return (
    <div className="col-span-full card p-8 sm:p-12 text-center animate-slide-up">
      <div className="w-16 h-16 rounded-2xl bg-[#f3f1ed] dark:bg-[#0e1322] flex items-center justify-center mx-auto mb-4 animate-float"><BookOpen className="w-8 h-8 text-slate-400" /></div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No books listed</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">List your textbooks to help fellow students!</p>
    </div>
  );
}

export default function BookExchange() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [books, setBooks] = useState([]);
  const [requestedBooks, setRequestedBooks] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [availability, setAvailability] = useState('All');
  const [showDonate, setShowDonate] = useState(false);
  const [donateForm, setDonateForm] = useState({ title: '', author: '', subject: '', condition: '', description: '' });
  const [bookImage, setBookImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const selectedFileRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try { const b = await getAllBooks(); setBooks(b); } catch (e) { console.warn('Failed to load books:', e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    selectedFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => setBookImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const openImagePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'book-input-' + Math.random().toString(36).substr(2, 9);
    input.accept = 'image/png,image/jpeg,image/jpg,image/gif,image/webp';
    input.style.cssText = 'display:block;position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
    input.addEventListener('change', function(e) {
      setTimeout(() => input.remove(), 100);
      const file = e.target.files?.[0];
      if (!file) return;
      selectedFileRef.current = file;
      const reader = new FileReader();
      reader.onload = (ev) => setBookImage(ev.target.result);
      reader.readAsDataURL(file);
    });
    document.body.appendChild(input);
    input.click();
  };

  const handleRequest = (bookId) => setRequestedBooks(prev => ({ ...prev, [bookId]: !prev[bookId] }));

  const handleDonate = async () => {
    if (!donateForm.title.trim() || !donateForm.author.trim()) return;
    setUploading(true);
    let imageUrl = null;
    if (selectedFileRef.current) {
      try { imageUrl = await uploadToCloudinary(selectedFileRef.current, 'stugrow/books'); addToast('Image uploaded!', 'success'); }
      catch { addToast('Failed to upload image. Check Cloudinary config.', 'error'); setUploading(false); return; }
    }
    try {
      await createBook({
        title: donateForm.title, author: donateForm.author, subject: donateForm.subject || 'General',
        condition: donateForm.condition || 'Good', price: 'Free', uploadedBy: user.id, available: true, image: imageUrl, description: donateForm.description,
      });
      const b = await getAllBooks(); setBooks(b);
    } catch (e) { console.error('Failed to create book:', e); }
    setDonateForm({ title: '', author: '', subject: '', condition: '', description: '' }); setBookImage(null); selectedFileRef.current = null; setShowDonate(false); setUploading(false);
  };

  const handleDelete = async (bookId) => {
    try { await deleteBook(bookId); setBooks(prev => prev.filter(b => b.id !== bookId)); } catch (e) { console.error('Failed to delete book:', e); }
  };

  const filteredBooks = books.filter(book => {
    if (searchQuery && !book.title.toLowerCase().includes(searchQuery.toLowerCase()) && !book.author?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedSubject !== 'All' && book.subject !== selectedSubject) return false;
    if (selectedCondition !== 'All' && book.condition !== selectedCondition) return false;
    if (availability === 'Available' && !book.available) return false;
    if (availability === 'Claimed' && book.available) return false;
    return true;
  });

  if (loading) return <div className="p-4 sm:p-8"><div className="card p-6 animate-pulse"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3" /></div></div>;

  return (
    <div className="p-4 sm:p-8 overflow-x-hidden">
      <div className="card p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#f3f1ed] dark:bg-[#0e1322] flex items-center justify-center flex-shrink-0"><BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-slate-500" /></div>
            <div><h3 className="font-semibold text-slate-900 dark:text-white">Donate Your Books</h3><p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Share knowledge with students who need it</p></div>
          </div>
          <button onClick={() => setShowDonate(!showDonate)} className="btn-primary flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center">{showDonate ? <><X className="w-4 h-4" />Cancel</> : <><Plus className="w-4 h-4" />List a Book</>}</button>
        </div>
        {showDonate && (
          <div className="mt-6 pt-6 border-t space-y-4 animate-fade-in" style={{ borderColor: '#e8e5e0' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" placeholder="Book title" className="input-field" value={donateForm.title} onChange={(e) => setDonateForm(p => ({ ...p, title: e.target.value }))} />
              <input type="text" placeholder="Author name" className="input-field" value={donateForm.author} onChange={(e) => setDonateForm(p => ({ ...p, author: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CustomSelect
                value={donateForm.subject}
                onChange={(val) => setDonateForm(p => ({ ...p, subject: val }))}
                options={branches}
                placeholder="Select Subject"
              />
              <select className="input-field" value={donateForm.condition} onChange={(e) => setDonateForm(p => ({ ...p, condition: e.target.value }))}><option value="">Condition</option><option value="Like New">Like New</option><option value="Good">Good</option><option value="Fair">Fair</option></select>
              <input type="text" placeholder="Description" className="input-field" value={donateForm.description} onChange={(e) => setDonateForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Book Cover Photo</label>
              <button onClick={openImagePicker} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"><Camera className="w-4 h-4" />{bookImage ? 'Change photo' : 'Upload book photo from device'}</button>
              {bookImage && <div className="relative mt-3 inline-block"><img src={bookImage} alt="Book cover" className="w-32 h-40 object-cover rounded-xl" /><button onClick={() => { setBookImage(null); selectedFileRef.current = null; }} className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"><X className="w-3.5 h-3.5" /></button></div>}
            </div>
            <button onClick={handleDonate} disabled={!donateForm.title.trim() || !donateForm.author.trim() || uploading} className="btn-primary w-full disabled:opacity-50">{uploading ? 'Uploading...' : 'Submit Book'}</button>
          </div>
        )}
      </div>

      <div className="card p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <ProfessionalSearch
              placeholder="Search books..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <div className="grid grid-cols-3 sm:flex gap-2">
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="input-field text-xs sm:text-sm"><option value="All">Subjects</option>{branches.map(b => <option key={b} value={b}>{b}</option>)}</select>
            <select value={selectedCondition} onChange={(e) => setSelectedCondition(e.target.value)} className="input-field text-xs sm:text-sm"><option value="All">Condition</option><option value="Like New">Like New</option><option value="Good">Good</option><option value="Fair">Fair</option></select>
            <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="input-field text-xs sm:text-sm"><option value="All">Status</option><option value="Available">Available</option><option value="Claimed">Claimed</option></select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {filteredBooks.length === 0 ? <EmptyBooks /> : filteredBooks.map(book => <BookCard key={book.id} book={book} requested={requestedBooks[book.id]} onRequest={handleRequest} onDelete={handleDelete} currentUserId={user?.id} />)}
      </div>
    </div>
  );
}