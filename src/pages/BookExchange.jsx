import { useState, useEffect, useRef } from 'react';
import { BookOpen, MessageCircle, Check, Plus, X, Inbox, Upload, Trash2, Camera, ShoppingBag, CreditCard, Info, QrCode, AlertCircle, ChevronRight, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { branches } from '../data/mockData';
import { uploadToCloudinary } from '../services/cloudinary';
import { createBook, getAllBooks, deleteBook, createConversation } from '../services/data';
import CustomSelect from '../components/CustomSelect';
import ProfessionalSearch from '../components/ProfessionalSearch';
import { matchSearch } from '../utils/searchUtils';

function BookCard({ book, requested, onRequest, onBuy, onDelete, currentUserId }) {
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
            book.price && book.price !== 'Free' ? (
              <button onClick={() => onBuy(book)} className="btn-primary flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200">
                <ShoppingBag className="w-4 h-4" /><span>Buy Book</span>
              </button>
            ) : (
              <button onClick={() => onRequest(book.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${requested ? 'bg-[#f3f1ed] dark:bg-[#0e1322] text-slate-600 dark:text-slate-400' : 'btn-primary'}`}>
                {requested ? <><Check className="w-4 h-4" /><span>Requested</span></> : <><MessageCircle className="w-4 h-4" /><span>Request</span></>}
              </button>
            )
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
  const navigate = useNavigate();

  const [books, setBooks] = useState([]);
  const [requestedBooks, setRequestedBooks] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [availability, setAvailability] = useState('All');
  const [showDonate, setShowDonate] = useState(false);
  const [donateForm, setDonateForm] = useState({ title: '', author: '', subject: '', condition: '', description: '', price: '' });
  const [bookImage, setBookImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const selectedFileRef = useRef(null);

  // Checkout Wizard State
  const [selectedBook, setSelectedBook] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Delivery details, 2: Payment options, 3: Simulated processing/QR, 4: Success
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' or 'card'
  const [deliveryForm, setDeliveryForm] = useState({
    fullName: '',
    rollNo: '',
    hostelRoom: '',
    phone: '',
  });
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

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

  const handleStartCheckout = (book) => {
    setSelectedBook(book);
    setCheckoutStep(1);
    setShowCheckout(true);
  };

  const executeCheckoutStep = () => {
    if (checkoutStep === 1) {
      if (!deliveryForm.fullName.trim() || !deliveryForm.rollNo.trim() || !deliveryForm.hostelRoom.trim() || !deliveryForm.phone.trim()) {
        addToast('Please fill out all delivery fields.', 'error');
        return;
      }
      setCheckoutStep(2);
    } else if (checkoutStep === 2) {
      if (paymentMethod === 'card') {
        if (!cardForm.cardNumber.trim() || !cardForm.expiry.trim() || !cardForm.cvv.trim()) {
          addToast('Please fill out all card fields.', 'error');
          return;
        }
      }
      setCheckoutStep(3);
      // Simulate loading/QR generation
      setTimeout(() => {
        setCheckoutStep(4);
      }, 3000);
    }
  };

  const closeCheckoutAndMarkClaimed = async () => {
    setShowCheckout(false);
    if (!selectedBook) return;
    try {
      await deleteBook(selectedBook.id);
      setBooks(prev => prev.filter(b => b.id !== selectedBook.id));
      addToast('Book claimed and purchased successfully!', 'success');
      setSelectedBook(null);
    } catch (e) {
      console.error('Failed to claim book:', e);
      addToast('Failed to claim book.', 'error');
    }
  };

  const handleChatWithSeller = async (seller) => {
    if (!user) return;
    if (!seller) return;
    if (seller.id === user.id) {
      alert("You cannot start a chat with yourself!");
      return;
    }
    try {
      const conversationId = await createConversation(user.id, seller.id);
      navigate('/inbox', { state: { targetUser: seller, conversationId } });
    } catch (e) {
      console.error('Failed to create conversation:', e);
      addToast('Failed to start chat with seller.', 'error');
    }
  };

  const handleDonate = async () => {
    if (!donateForm.title.trim() || !donateForm.author.trim()) return;
    if (donateForm.price && (isNaN(donateForm.price) || Number(donateForm.price) < 0)) {
      addToast('Price must be a valid positive number.', 'error');
      return;
    }
    setUploading(true);
    let imageUrl = null;
    if (selectedFileRef.current) {
      try { imageUrl = await uploadToCloudinary(selectedFileRef.current, 'stugrow/books'); addToast('Image uploaded!', 'success'); }
      catch { addToast('Failed to upload image. Check Cloudinary config.', 'error'); setUploading(false); return; }
    }
    try {
      const priceVal = donateForm.price && Number(donateForm.price) > 0 ? `₹${Number(donateForm.price)}` : 'Free';
      await createBook({
        title: donateForm.title, author: donateForm.author, subject: donateForm.subject || 'General',
        condition: donateForm.condition || 'Good', price: priceVal, uploadedBy: user.id, available: true, image: imageUrl, description: donateForm.description,
      });
      const b = await getAllBooks(); setBooks(b);
      addToast('Book listed successfully!', 'success');
    } catch (e) { console.error('Failed to create book:', e); addToast('Failed to list book.', 'error'); }
    setDonateForm({ title: '', author: '', subject: '', condition: '', description: '', price: '' }); setBookImage(null); selectedFileRef.current = null; setShowDonate(false); setUploading(false);
  };

  const handleDelete = async (bookId) => {
    try { await deleteBook(bookId); setBooks(prev => prev.filter(b => b.id !== bookId)); } catch (e) { console.error('Failed to delete book:', e); }
  };

  const filteredBooks = books.filter(book => {
    if (searchQuery && !matchSearch(book.title, searchQuery) && !matchSearch(book.author, searchQuery)) return false;
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
              <select className="input-field" value={donateForm.condition} onChange={(e) => setDonateForm(p => ({ ...p, condition: e.target.value }))}>
                <option value="">Condition</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
              <input 
                type="number" 
                placeholder="Price (₹) - Leave blank for Free" 
                className="input-field" 
                value={donateForm.price} 
                onChange={(e) => setDonateForm(p => ({ ...p, price: e.target.value }))} 
              />
            </div>
            <div>
              <input type="text" placeholder="Description (e.g. details about contents, condition, etc.)" className="input-field w-full" value={donateForm.description} onChange={(e) => setDonateForm(p => ({ ...p, description: e.target.value }))} />
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
        {filteredBooks.length === 0 ? <EmptyBooks /> : filteredBooks.map(book => <BookCard key={book.id} book={book} requested={requestedBooks[book.id]} onRequest={handleRequest} onBuy={handleStartCheckout} onDelete={handleDelete} currentUserId={user?.id} />)}
      </div>

      {/* Checkout/Purchase Wizard Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-[#080b14] w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-[#0e1322] overflow-hidden animate-scale-in">
            {/* Step Wizard Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-white/[0.02]">
              <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                Secure Checkout: Step {checkoutStep} of 4
              </h3>
              {checkoutStep < 4 && (
                <button
                  onClick={() => setShowCheckout(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Wizard Body */}
            <div className="p-5">
              {checkoutStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-[#f0f9ff] dark:bg-blue-950/20 text-[#0284c7] border border-[#bae6fd] dark:border-blue-900/30 p-3.5 rounded-xl text-xs flex gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Enter delivery/hostel coordinates. Payments are escrow-simulated for secure peer-to-peer collection.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                    <input
                      type="text"
                      value={deliveryForm.fullName}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, fullName: e.target.value })}
                      placeholder="e.g. Jane Doe"
                      className="input-field w-full text-sm rounded-xl h-10"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Roll Number</label>
                      <input
                        type="text"
                        value={deliveryForm.rollNo}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, rollNo: e.target.value })}
                        placeholder="e.g. 21BCS012"
                        className="input-field w-full text-sm rounded-xl h-10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hostel Room</label>
                      <input
                        type="text"
                        value={deliveryForm.hostelRoom}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, hostelRoom: e.target.value })}
                        placeholder="e.g. Hostel 4, Rm 102"
                        className="input-field w-full text-sm rounded-xl h-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={deliveryForm.phone}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, phone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="input-field w-full text-sm rounded-xl h-10"
                    />
                  </div>
                </div>
              )}

              {checkoutStep === 2 && (
                <div className="space-y-5 animate-fade-in">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Payment Method</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setPaymentMethod('upi')}
                      className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                        paymentMethod === 'upi'
                          ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 ring-1 ring-emerald-500'
                          : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <QrCode className={`w-6 h-6 ${paymentMethod === 'upi' ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Scan UPI QR</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                        paymentMethod === 'card'
                          ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 ring-1 ring-emerald-500'
                          : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Credit/Debit Card</span>
                    </button>
                  </div>

                  {paymentMethod === 'card' && (
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 animate-fade-in">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Card Number</label>
                        <input
                          type="text"
                          value={cardForm.cardNumber}
                          onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                          placeholder="4111 2222 3333 4444"
                          className="input-field w-full text-sm rounded-xl h-10"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Date</label>
                          <input
                            type="text"
                            value={cardForm.expiry}
                            onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })}
                            placeholder="MM/YY"
                            className="input-field w-full text-sm rounded-xl h-10"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CVV</label>
                          <input
                            type="password"
                            value={cardForm.cvv}
                            onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value })}
                            placeholder="***"
                            className="input-field w-full text-sm rounded-xl h-10"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'upi' && (
                    <div className="bg-[#f0fdf4] dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-xl text-center space-y-1 animate-fade-in">
                      <p className="text-xs font-bold uppercase tracking-widest">Instant UPI Checkout</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Generate a custom secure payment QR code to scan and complete transaction instantly.</p>
                    </div>
                  )}
                </div>
              )}

              {checkoutStep === 3 && (
                <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in space-y-4">
                  {paymentMethod === 'upi' ? (
                    <>
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-2">
                        {/* Mock QR Code */}
                        <div className="w-40 h-40 bg-[#f8f6f3] dark:bg-slate-800/40 rounded-xl flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 relative">
                          <QrCode className="w-24 h-24 text-slate-600 dark:text-slate-400" />
                          <div className="absolute inset-0 border border-emerald-500 rounded-xl animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Scan & Pay {selectedBook?.price}</p>
                        <p className="text-xs text-slate-400">Scan using any UPI App (GPay, PhonePe, Paytm)</p>
                      </div>
                      <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-[11px] text-slate-400 animate-pulse">Waiting for transaction confirmation...</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Processing Payment Securely</p>
                      <p className="text-xs text-slate-400">Verifying bank details, please do not close the window...</p>
                    </>
                  )}
                </div>
              )}

              {checkoutStep === 4 && (
                <div className="flex flex-col items-center justify-center py-6 text-center animate-scale-in space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 border border-emerald-400">
                    <Check className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white mb-1">Order Placed Successfully!</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Congratulations! Your payment is confirmed. The book has been reserved, and the seller ({selectedBook?.uploadedBy?.name}) has been notified.
                    </p>
                  </div>
                  <div className="bg-[#fcfbf9] dark:bg-[#0e1322]/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 w-full text-left space-y-1 text-xs">
                    <p className="text-slate-400 font-bold uppercase tracking-wider">Pickup instructions</p>
                    <p className="text-slate-700 dark:text-slate-300 leading-normal">
                      Use the button below to text the seller directly in messages and coordinate delivery/pickup details.
                    </p>
                  </div>
                </div>
              )}

              {/* Wizard Footer Controls */}
              {checkoutStep < 4 ? (
                <div className="flex gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-6">
                  {checkoutStep > 1 && checkoutStep < 3 && (
                    <button
                      onClick={() => setCheckoutStep(checkoutStep - 1)}
                      className="btn border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 py-2.5 px-4 font-bold rounded-xl text-xs sm:text-sm"
                    >
                      Back
                    </button>
                  )}
                  {checkoutStep < 3 ? (
                    <button
                      onClick={executeCheckoutStep}
                      className="btn-primary flex-1 py-2.5 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-6">
                  <button
                    onClick={() => handleChatWithSeller(selectedBook.uploadedBy)}
                    className="btn border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 py-3 font-bold rounded-xl text-sm flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    Message Seller
                  </button>
                  <button
                    onClick={closeCheckoutAndMarkClaimed}
                    className="btn-primary py-3 font-bold rounded-xl text-sm shadow-md"
                  >
                    Return to Book Exchange
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}