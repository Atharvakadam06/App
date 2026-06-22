import { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  Trash2,
  X,
  Tag,
  Cpu,
  Code,
  User,
  Info,
  Check,
  CreditCard,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  createProduct,
  getAllProducts,
  deleteProduct,
  updateProductStatus,
  createConversation,
} from '../services/data';
import { matchSearch } from '../utils/searchUtils';

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'price-low', 'price-high'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Listing Form State
  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Projects',
    condition: 'New',
    image: '',
    contactInfo: '',
  });
  const [formError, setFormError] = useState('');

  // Checkout Wizard State
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Delivery details, 2: Payment options, 3: Simulated processing/QR, 4: Success
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi', 'card'
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

  const categories = [
    { name: 'All', icon: ShoppingBag, color: 'from-slate-500 to-slate-600' },
    { name: 'Projects', icon: Code, color: 'from-blue-500 to-blue-600' },
    { name: 'Electronics', icon: Cpu, color: 'from-purple-500 to-purple-600' },
    { name: 'Other', icon: Tag, color: 'from-amber-500 to-amber-600' },
  ];

  const defaultProducts = [
    {
      id: 'default_1',
      title: 'Smart Drip Irrigation System',
      description: 'An IoT smart drip irrigation prototype using Arduino Uno, capacitive soil moisture sensors, and a 5V pump. Includes complete C++ source code, wiring schematic diagram, and project report PDF. Perfect ready-to-present minor project.',
      price: 1499,
      category: 'Projects',
      condition: 'Like New',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
      sellerId: 'demo_alice',
      seller: { id: 'demo_alice', name: 'Alice Sharma', username: 'alice.sharma', avatar: 'https://ui-avatars.com/api/?name=Alice+Sharma&background=334155&color=fff&size=150', college: 'IIT Bombay' },
      contactInfo: 'alice@college.ac.in',
      status: 'available',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: 'default_2',
      title: 'CLRS Introduction to Algorithms',
      description: 'Third Edition of Introduction to Algorithms by Cormen, Leiserson, Rivest, and Stein. Paperback, clean interior with no pencil markings or highlight marks. In highly readable, excellent condition.',
      price: 499,
      category: 'Other',
      condition: 'Good',
      image: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=800&q=80',
      sellerId: 'demo_bob',
      seller: { id: 'demo_bob', name: 'Bob Patel', username: 'bob.patel', avatar: 'https://ui-avatars.com/api/?name=Bob+Patel&background=334155&color=fff&size=150', college: 'NIT Trichy' },
      contactInfo: 'bob@college.ac.in',
      status: 'available',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
    {
      id: 'default_3',
      title: 'Varmilo VA87M Mechanical Keyboard',
      description: 'Tenkeyless layout mechanical keyboard featuring original Cherry MX Brown tactile switches. Sleek white LED backlighting with custom grey and white PBT keycaps. Cleaned and tested thoroughly.',
      price: 2499,
      category: 'Electronics',
      condition: 'Good',
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
      sellerId: 'demo_alice',
      seller: { id: 'demo_alice', name: 'Alice Sharma', username: 'alice.sharma', avatar: 'https://ui-avatars.com/api/?name=Alice+Sharma&background=334155&color=fff&size=150', college: 'IIT Bombay' },
      contactInfo: 'alice@college.ac.in',
      status: 'available',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
    {
      id: 'default_4',
      title: 'React Native Campus Delivery App Starter',
      description: 'Complete UI starter kit for a hyper-local campus delivery application. Built with Expo, TypeScript, NativeWind/Tailwind. Includes 15+ beautifully animated screens like Cart, Tracking, and Checkout. Complete mock backend integration included.',
      price: 799,
      category: 'Projects',
      condition: 'New',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
      sellerId: 'demo_bob',
      seller: { id: 'demo_bob', name: 'Bob Patel', username: 'bob.patel', avatar: 'https://ui-avatars.com/api/?name=Bob+Patel&background=334155&color=fff&size=150&', college: 'NIT Trichy' },
      contactInfo: 'bob@college.ac.in',
      status: 'available',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
  ];

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      let prodList = await getAllProducts();
      // Filter out empty arrays or seed default products if none exist
      if (prodList.length === 0) {
        for (const dp of defaultProducts) {
          await createProduct(dp);
        }
        prodList = await getAllProducts();
      }
      const mapped = prodList.map(p => p.category === 'Books' ? { ...p, category: 'Other' } : p);
      setProducts(mapped);
    } catch (e) {
      console.warn('Error loading products:', e);
      const mappedDefaults = defaultProducts.map(p => p.category === 'Books' ? { ...p, category: 'Other' } : p);
      setProducts(mappedDefaults);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!productForm.title.trim() || !productForm.price || !productForm.contactInfo.trim()) {
      setFormError('Please fill out all required fields.');
      return;
    }

    if (isNaN(productForm.price) || Number(productForm.price) < 0) {
      setFormError('Price must be a valid positive number.');
      return;
    }

    try {
      const listingImage = productForm.image.trim() || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80';
      await createProduct({
        ...productForm,
        image: listingImage,
        sellerId: user.id,
        status: 'available',
      });
      setProductForm({
        title: '',
        description: '',
        price: '',
        category: 'Projects',
        condition: 'New',
        image: '',
        contactInfo: '',
      });
      setShowCreateModal(false);
      loadProducts();
    } catch (e) {
      console.error('Failed to list product:', e);
      setFormError('An error occurred. Please try again.');
    }
  };

  const handleDeleteProduct = async (id, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this listing?')) {
      try {
        await deleteProduct(id);
        setSelectedProduct(null);
        loadProducts();
      } catch (e) {
        console.error('Failed to delete product:', e);
      }
    }
  };

  const handleToggleSold = async (product, e) => {
    e.stopPropagation();
    const newStatus = product.status === 'sold' ? 'available' : 'sold';
    try {
      await updateProductStatus(product.id, newStatus);
      if (selectedProduct && selectedProduct.id === product.id) {
        setSelectedProduct({ ...selectedProduct, status: newStatus });
      }
      loadProducts();
    } catch (e) {
      console.error('Failed to update product status:', e);
    }
  };

  const handleChatWithSeller = async (seller) => {
    if (!user) return;
    if (seller.id === user.id) {
      alert("You cannot start a chat with yourself!");
      return;
    }
    try {
      const conversationId = await createConversation(user.id, seller.id);
      navigate('/inbox', { state: { targetUser: seller, conversationId } });
    } catch {
      navigate('/inbox', { state: { targetUser: seller } });
    }
  };

  const startCheckout = () => {
    setCheckoutStep(1);
    setShowCheckout(true);
  };

  const executeCheckoutStep = () => {
    if (checkoutStep === 1) {
      if (!deliveryForm.fullName.trim() || !deliveryForm.phone.trim() || !deliveryForm.hostelRoom.trim()) {
        alert('Please fill out all delivery fields.');
        return;
      }
      setCheckoutStep(2);
    } else if (checkoutStep === 2) {
      if (paymentMethod === 'card') {
        if (!cardForm.cardNumber || !cardForm.expiry || !cardForm.cvv) {
          alert('Please enter your card details.');
          return;
        }
      }
      setCheckoutStep(3);
      // Simulate payment processing loader
      setTimeout(() => {
        setCheckoutStep(4);
      }, 3000);
    }
  };

  const closeCheckoutAndMarkSold = async () => {
    setShowCheckout(false);
    setShowCreateModal(false);
    // Mark the selected product as sold mockingly upon payment success
    if (selectedProduct) {
      try {
        await updateProductStatus(selectedProduct.id, 'sold');
        loadProducts();
      } catch (e) {
        console.warn(e);
      }
    }
    setSelectedProduct(null);
  };

  // Filter & Sort computation
  const filteredProducts = products
    .filter((p) => activeCategory === 'All' || p.category === activeCategory)
    .filter((p) => {
      if (!searchQuery) return true;
      return (
        matchSearch(p.title, searchQuery) ||
        matchSearch(p.description, searchQuery) ||
        matchSearch(p.category, searchQuery)
      );
    })
    .filter((p) => conditionFilter === 'All' || p.condition === conditionFilter)
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); // newest first
    });

  return (
    <div className="p-4 sm:p-8 overflow-x-hidden select-none">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects, electronics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-11 w-full bg-white dark:bg-[#0e1322] border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-slate-400 focus:border-transparent rounded-2xl h-11"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Condition Filter */}
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="input-field py-2 px-3 bg-white dark:bg-[#0e1322] border-slate-200 dark:border-slate-800 text-xs sm:text-sm rounded-xl cursor-pointer"
          >
            <option value="All">All Conditions</option>
            <option value="New">New</option>
            <option value="Like New">Like New</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field py-2 px-3 bg-white dark:bg-[#0e1322] border-slate-200 dark:border-slate-800 text-xs sm:text-sm rounded-xl cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>

          {/* Sell Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 text-xs sm:text-sm font-semibold rounded-xl h-10 px-4 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Sell Item
          </button>
        </div>
      </div>

      {/* Categories Horizontal Slider */}
      <div className="flex gap-2.5 mb-8 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:grid sm:grid-cols-4">
        {categories.map((cat) => {
          const CatIcon = cat.icon;
          const isActive = activeCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`card p-3.5 sm:p-5 text-left transition-all duration-300 flex-shrink-0 w-24 sm:w-auto card-hover cursor-pointer border ${
                isActive
                  ? 'border-slate-800 dark:border-slate-300 ring-1 ring-slate-800 dark:ring-slate-300 shadow-md bg-slate-50/50 dark:bg-white/[0.02]'
                  : 'border-slate-100 dark:border-[#0e1322]'
              }`}
            >
              <div
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-2`}
              >
                <CatIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm whitespace-nowrap">
                {cat.name}
              </h3>
            </button>
          );
        })}
      </div>

      {/* Grid of Listings */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-80 bg-slate-100 dark:bg-slate-800/20" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card p-12 text-center max-w-md mx-auto animate-fade-in border border-slate-200/50 dark:border-slate-800/50">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-[#0e1322] flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800/80">
            <ShoppingBag className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">No items found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            We couldn't find any listings matching your filters. Create a new listing or expand your criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((prod) => {
            const isOwner = prod.sellerId === user?.id;
            return (
              <div
                key={prod.id}
                onClick={() => setSelectedProduct(prod)}
                className={`group card relative overflow-hidden flex flex-col h-full card-hover cursor-pointer transition-all duration-300 border border-slate-100 dark:border-[#0e1322] bg-white dark:bg-[#080b14]`}
              >
                {/* Product Image and status overlay */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-50 dark:bg-[#0e1322] border-b border-slate-100 dark:border-[#0e1322]">
                  <img
                    src={prod.image}
                    alt={prod.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {prod.status === 'sold' && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                      <span className="bg-rose-500 text-white font-black text-xs uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md">
                        Sold
                      </span>
                    </div>
                  )}
                  {/* Category Badge overlay */}
                  <span className="absolute top-3 left-3 bg-slate-900/75 dark:bg-white/85 text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg backdrop-blur-md">
                    {prod.category}
                  </span>
                  {/* Price Tag overlay */}
                  <span className="absolute bottom-3 right-3 bg-emerald-500 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-sm">
                    ₹{prod.price}
                  </span>
                </div>

                {/* Listing Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base line-clamp-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {prod.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                      {prod.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                    {/* Seller details */}
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={prod.seller?.avatar || 'https://ui-avatars.com/api/?name=Student'}
                        alt={prod.seller?.name || 'Seller'}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                      />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                        {isOwner ? 'Me' : prod.seller?.name}
                      </span>
                    </div>

                    {/* Condition badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        prod.condition === 'New'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                          : prod.condition === 'Like New'
                          ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30'
                          : prod.condition === 'Good'
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30'
                          : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                      }`}
                    >
                      {prod.condition}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* "Sell Item" Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white dark:bg-[#080b14] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 dark:border-[#0e1322] overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/60">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                List Your Item for Sale
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleCreateProduct} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2 border border-rose-100 dark:border-rose-900/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Item Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mechanical Keyboard, CLRS Textbook..."
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  className="input-field w-full text-sm rounded-xl h-11"
                  required
                />
              </div>

              {/* Price & Category Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="input-field w-full text-sm rounded-xl h-11"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="input-field w-full text-sm rounded-xl h-11"
                  >
                    <option value="Projects">Projects</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Condition & Image URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Condition *
                  </label>
                  <select
                    value={productForm.condition}
                    onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
                    className="input-field w-full text-sm rounded-xl h-11"
                  >
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="Link to image..."
                    value={productForm.image}
                    onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                    className="input-field w-full text-sm rounded-xl h-11"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Detailed Description
                </label>
                <textarea
                  placeholder="Describe the condition, usage, inclusions or code features..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="input-field w-full text-sm rounded-xl min-h-24 resize-none p-3.5"
                />
              </div>

              {/* Contact Info */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Contact Information *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Email / Phone / Hostel room"
                  value={productForm.contactInfo}
                  onChange={(e) => setProductForm({ ...productForm, contactInfo: e.target.value })}
                  className="input-field w-full text-sm rounded-xl h-11"
                  required
                />
              </div>

              {/* Submit */}
              <button type="submit" className="btn-primary w-full h-11 rounded-xl font-bold mt-2">
                Publish Listing
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Product Details Side Panel / Popup Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white dark:bg-[#080b14] w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-100 dark:border-[#0e1322] overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-scale-in">
            {/* Left side: Image or Mesh Gradient */}
            <div className="relative flex-1 md:max-w-md bg-slate-950 flex items-center justify-center overflow-hidden aspect-video md:aspect-auto">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.title}
                className="w-full h-full object-cover max-h-[40vh] md:max-h-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              {selectedProduct.status === 'sold' && (
                <div className="absolute top-4 right-4 bg-rose-500 text-white font-black text-xs uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-lg">
                  Sold
                </div>
              )}
            </div>

            {/* Right side: Product and Seller info */}
            <div className="flex-1 p-5 sm:p-7 flex flex-col justify-between overflow-y-auto no-scrollbar max-h-[50vh] md:max-h-none">
              <div>
                {/* Header info */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="bg-slate-100 dark:bg-[#0e1322] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                    {selectedProduct.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${
                      selectedProduct.condition === 'New'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                        : selectedProduct.condition === 'Like New'
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                        : selectedProduct.condition === 'Good'
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                        : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {selectedProduct.condition} Condition
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {selectedProduct.title}
                  </h2>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Price</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-500">₹{selectedProduct.price}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-[#fbfaf8] dark:bg-[#0e1322]/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850/50">
                    {selectedProduct.description || 'No description provided.'}
                  </p>
                </div>

                {/* Seller Section */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#0e1322]/60 rounded-2xl border border-slate-100 dark:border-slate-800/40 mb-6">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedProduct.seller?.avatar || 'https://ui-avatars.com/api/?name=Student'}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                    />
                    <div>
                      <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {selectedProduct.seller?.name}
                      </h5>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        @{selectedProduct.seller?.username} · {selectedProduct.seller?.college || 'StuGrow'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Contact Info</p>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{selectedProduct.contactInfo}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-auto">
                {selectedProduct.sellerId === user?.id ? (
                  // Seller options
                  <>
                    <button
                      onClick={(e) => handleToggleSold(selectedProduct, e)}
                      className={`btn flex-1 py-3 font-bold rounded-xl text-sm ${
                        selectedProduct.status === 'sold'
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/10'
                      }`}
                    >
                      {selectedProduct.status === 'sold' ? 'Mark Available' : 'Mark as Sold'}
                    </button>
                    <button
                      onClick={(e) => handleDeleteProduct(selectedProduct.id, e)}
                      className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100 dark:border-rose-900/20"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  // Buyer options
                  <>
                    <button
                      onClick={() => handleChatWithSeller(selectedProduct.seller)}
                      disabled={selectedProduct.status === 'sold'}
                      className="btn border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 py-3 px-5 font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat with Seller
                    </button>
                    <button
                      onClick={startCheckout}
                      disabled={selectedProduct.status === 'sold'}
                      className="btn-primary flex-1 py-3 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Buy Now
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="btn border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400 py-3 px-4 font-bold rounded-xl text-sm md:hidden"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Scan & Pay ₹{selectedProduct?.price}</p>
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
                      Congratulations! Your payment is confirmed. The product has been reserved, and the seller ({selectedProduct?.seller?.name}) has been notified.
                    </p>
                  </div>
                  <div className="bg-[#fcfbf9] dark:bg-[#0e1322]/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 w-full text-left space-y-1 text-xs">
                    <p className="text-slate-400 font-bold uppercase tracking-wider">Pickup instructions</p>
                    <p className="text-slate-700 dark:text-slate-300 leading-normal">
                      Use the button below to text the seller directly in messages and coordinate delivery details. Contact Email: <strong>{selectedProduct?.contactInfo}</strong>
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
                    onClick={() => handleChatWithSeller(selectedProduct.seller)}
                    className="btn border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 py-3 font-bold rounded-xl text-sm flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    Message Seller
                  </button>
                  <button
                    onClick={closeCheckoutAndMarkSold}
                    className="btn-primary py-3 font-bold rounded-xl text-sm shadow-md"
                  >
                    Return to Marketplace
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
