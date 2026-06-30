import { useState, useEffect } from 'react';
import { 
  ShoppingBag, Heart, User, Search, MapPin, Phone, MessageSquare, 
  ChevronRight, Sparkles, Star, ShieldCheck, HelpCircle, Sun, Moon, 
  Menu, X, MapPinOff, ArrowRight, CheckCircle2, Clock, Mail, 
  ThumbsUp, Tag, Plus, Settings, BarChart2, Home, Store, Trash2 
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

import { db, auth } from './firebase';
import { seedDatabase } from './seed';
import { Product, CartItem, Order, Coupon } from './types';

// Component imports
import AuthModal from './components/AuthModal';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import CartModal from './components/CartModal';
import CheckoutForm from './components/CheckoutForm';
import AdminPanel from './components/AdminPanel';
import OrderHistoryModal from './components/OrderHistoryModal';

export default function App() {
  // Theme & Layout
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'HOME' | 'SHOP' | 'CHECKOUT' | 'WISHLIST' | 'ACCOUNT'>('HOME');
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication State
  const [user, setUser] = useState<{ email: string | null; name: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminView, setShowAdminView] = useState(false);

  // Filter, Search, and Category parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [selectedSize, setSelectedSize] = useState<string>('All');
  const [selectedColor, setSelectedColor] = useState<string>('All');
  const [priceRange, setPriceRange] = useState<number>(5000);
  const [sortOption, setSortOption] = useState<string>('Popularity');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('All');

  // Shopping Cart & Wishlist local states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  // Active overlays / Modals
  const [activeQuickViewProduct, setActiveQuickViewProduct] = useState<Product | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Active Coupon details passed to checkout
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Placed Order feedback overlay
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  // Flash Sale state (Timer ticking)
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 24, seconds: 12 });

  // Hero Carousel State
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);

  // Fetch all database records
  const loadDatabaseRecords = async () => {
    try {
      // First seed if database is empty
      await seedDatabase();

      // Load products
      const pSnap = await getDocs(collection(db, 'products'));
      const pList: Product[] = [];
      pSnap.forEach(doc => {
        const d = doc.data();
        pList.push(d as Product);
      });
      setProducts(pList);

      // Load coupons
      const cSnap = await getDocs(collection(db, 'coupons'));
      const cList: Coupon[] = [];
      cSnap.forEach(doc => {
        cList.push(doc.data() as Coupon);
      });
      setCoupons(cList);

      // Load orders
      const oSnap = await getDocs(collection(db, 'orders'));
      const oList: Order[] = [];
      oSnap.forEach(doc => {
        const item = doc.data() as Order;
        // Inject Firestore document ID if helpful
        oList.push({ id: doc.id, ...item });
      });
      // Sort orders by most recent
      oList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(oList);

    } catch (error) {
      console.error('Error loading Firestore database records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseRecords();

    // Track Authentication state
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        const isUserAdmin = authUser.email === 'adyah2310@gmail.com';
        setUser({
          email: authUser.email,
          name: authUser.displayName || authUser.email?.split('@')[0] || 'Customer'
        });
        setIsAdmin(isUserAdmin);
        if (isUserAdmin) {
          setShowAdminView(true); // Auto route admin to Admin Dashboard
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setShowAdminView(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Flash Sale Countdown tick
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 4, minutes: 0, seconds: 0 }; // Loop timer
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Automatic Hero Slider tick
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setActiveHeroIdx((prev) => (prev === 2 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(slideInterval);
  }, []);

  // Dark Mode side effects
  useEffect(() => {
    const rootElement = document.getElementById('root-wrapper');
    if (darkMode) {
      rootElement?.classList.add('dark');
    } else {
      rootElement?.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle Log-In Actions
  const handleLoginSuccess = (email: string) => {
    const isUserAdmin = email === 'adyah2310@gmail.com';
    setIsAdmin(isUserAdmin);
    if (isUserAdmin) {
      setShowAdminView(true);
    }
    loadDatabaseRecords(); // reload database content with authenticated context
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setIsAdmin(false);
    setShowAdminView(false);
    setCart([]);
    setWishlist([]);
  };

  // Cart Operations
  const handleAddToCart = (product: Product, size: string, color: string, qty = 1) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedSize === size && item.selectedColor === color
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity = Math.min(product.stock, updated[existingIdx].quantity + qty);
        return updated;
      } else {
        return [...prev, { product, quantity: qty, selectedSize: size, selectedColor: color }];
      }
    });

    // Fire tiny feedback
    alert(`Added ${qty} x ${product.name} (Size: ${size}) to your Cart bags!`);
  };

  const handleBuyNow = (product: Product, size: string, color: string, qty = 1) => {
    // Adds to cart and instantly transitions to Checkout
    handleAddToCart(product, size, color, qty);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, size: string, color: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveCartItem(productId, size, color);
      return;
    }
    setCart((prev) => 
      prev.map((item) => 
        item.product.id === productId && item.selectedSize === size && item.selectedColor === color
          ? { ...item, quantity: qty }
          : item
      )
    );
  };

  const handleRemoveCartItem = (productId: string, size: string, color: string) => {
    setCart((prev) => 
      prev.filter((item) => !(item.product.id === productId && item.selectedSize === size && item.selectedColor === color))
    );
  };

  // Wishlist operations
  const handleToggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  // PDP Quick view operations
  const handleOpenPDP = (product: Product) => {
    setActiveQuickViewProduct(product);
    
    // Track recently viewed products
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      return [product, ...filtered].slice(0, 5); // limit to 5 products
    });
  };

  // Checkout proceeding trigger
  const handleProceedToCheckout = (coupon: Coupon | null, discountVal: number) => {
    setAppliedCoupon(coupon);
    setDiscountAmount(discountVal);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  // Order complete success
  const handleOrderSuccess = (order: Order) => {
    setLastPlacedOrder(order);
    loadDatabaseRecords(); // reload live database to reflect inventory updates
  };

  // Filter matrices calculations
  const categoriesList = ['All', 'Shirts', 'Pants', 'Jeans', 'T-Shirts', 'Trousers', 'Jackets', 'Accessories'];
  const brandsList = ['All', 'Rightnow Garments'];
  const sizesList = ['All', 'S', 'M', 'L', 'XL', 'XXL', '30', '32', '34', '36'];
  const colorsList = ['All', 'Off-White', 'Soft Blue', 'Sage Green', 'Black', 'White', 'Navy/Crimson', 'Charcoal Grey', 'Tan Suede', 'Vintage Tan'];

  // Apply matrix sorting and query searching
  const filteredCatalog = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.subCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesBrand = selectedBrand === 'All' || p.brand === selectedBrand;
    const matchesSize = selectedSize === 'All' || p.sizes.includes(selectedSize);
    const matchesColor = selectedColor === 'All' || p.colors.includes(selectedColor);
    const matchesPrice = p.offerPrice <= priceRange;
    const matchesOccasion = selectedOccasion === 'All' || p.specifications.occasion.toLowerCase().includes(selectedOccasion.toLowerCase());

    return matchesSearch && matchesCategory && matchesBrand && matchesSize && matchesColor && matchesPrice && matchesOccasion;
  }).sort((a, b) => {
    if (sortOption === 'Newest') {
      return b.isNewArrival ? 1 : -1;
    } else if (sortOption === 'PriceLowHigh') {
      return a.offerPrice - b.offerPrice;
    } else if (sortOption === 'PriceHighLow') {
      return b.offerPrice - a.offerPrice;
    } else {
      // Popularity/Ratings default
      return b.ratings - a.ratings;
    }
  });

  // Hero Slide Outfits
  const HERO_SLIDES = [
    {
      title: "Discover French Linen Wear",
      sub: "Bespoke 100% pure linen shirts engineered for breezy summer comfort and resort aesthetics.",
      image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1600&auto=format&fit=crop&q=80",
    },
    {
      title: "Heavyweight Loopback Streetwear",
      sub: "Drop shoulder oversized tees and utility cargos woven from 240 GSM organic cotton yarn.",
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1600&auto=format&fit=crop&q=80",
    },
    {
      title: "Premium Japanese Selvedge",
      sub: "Raw indigo shuttle-loomed denim structured to fade uniquely with your body contours over time.",
      image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=1600&auto=format&fit=crop&q=80",
    }
  ];

  return (
    <div 
      id="root-wrapper" 
      className={`min-h-screen text-neutral-900 bg-white transition-colors duration-300 ${darkMode ? 'dark bg-neutral-950 text-neutral-100' : ''}`}
    >
      
      {/* 1. TOP SPECIAL HOLIDAY DISCOUNT TAPE */}
      <div id="promo-banner" className="bg-neutral-950 text-white py-2 px-4 text-center text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shrink-0 border-b border-orange-500/30">
        <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
        GRAND SEEDING OPENING CELEBRATION! USE COUPON <span className="text-orange-500 underline font-black">FIRST10</span> FOR FLAT 10% DISCOUNT SITEWIDE!
      </div>

      {/* 2. PRIMARY NAVIGATION BAR */}
      <header id="main-nav-header" className="sticky top-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-900 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-22 flex items-center justify-between gap-4">
          
          {/* Menu toggler (Mobile) */}
          <button 
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-neutral-700 dark:text-neutral-300 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* BRAND EMBLEM (MATCHES REFERENCE CREST) */}
          <div 
            onClick={() => { setShowAdminView(false); setActiveTab('HOME'); }}
            className="flex items-center gap-3 cursor-pointer text-left shrink-0"
          >
            {/* Crown Crest Circular Logo */}
            <div className="relative w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500 flex items-center justify-center shadow-xs">
              <span className="font-serif-display text-sm font-black text-amber-600 dark:text-amber-500 leading-none">RN</span>
              <div className="absolute -bottom-1 bg-amber-500 text-white font-black text-[6px] uppercase tracking-widest px-1 py-0.5 rounded-sm shadow-xs whitespace-nowrap">
                EST. 2026
              </div>
            </div>
            
            <div className="flex flex-col">
              <h1 
                id="brand-emblem"
                className="text-lg md:text-xl font-black tracking-tight uppercase text-neutral-950 dark:text-white leading-none"
              >
                RIGHTNOW GARMENTS
              </h1>
              <span className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider block mt-0.5">
                MEN & WOMENS WEAR • TRICHY
              </span>
            </div>
          </div>

          {/* CENTRAL NAV LIST (Desktop) */}
          <nav id="desktop-navbar" className="hidden md:flex items-center gap-5 text-[11px] font-black uppercase tracking-widest text-neutral-700 dark:text-neutral-300">
            <button 
              onClick={() => { setShowAdminView(false); setActiveTab('HOME'); }} 
              className={`transition-colors py-2 border-b-2 ${activeTab === 'HOME' ? 'text-orange-500 border-orange-500' : 'border-transparent hover:text-orange-500'}`}
            >
              Home
            </button>
            <button 
              onClick={() => { setShowAdminView(false); setActiveTab('SHOP'); setSelectedCategory('All'); }} 
              className={`transition-colors py-2 border-b-2 ${activeTab === 'SHOP' && selectedCategory === 'All' ? 'text-orange-500 border-orange-500' : 'border-transparent hover:text-orange-500'}`}
            >
              Shop
            </button>
            <button 
              onClick={() => { setShowAdminView(false); setActiveTab('SHOP'); setSelectedCategory('Shirts'); }} 
              className={`transition-colors py-2 border-b-2 ${activeTab === 'SHOP' && selectedCategory === 'Shirts' ? 'text-orange-500 border-orange-500' : 'border-transparent hover:text-orange-500'}`}
            >
              Shirts
            </button>
            <button 
              onClick={() => { setShowAdminView(false); setActiveTab('SHOP'); setSelectedCategory('T-Shirts'); }} 
              className={`transition-colors py-2 border-b-2 ${activeTab === 'SHOP' && selectedCategory === 'T-Shirts' ? 'text-orange-500 border-orange-500' : 'border-transparent hover:text-orange-500'}`}
            >
              T-Shirts
            </button>
            <button 
              onClick={() => { setShowAdminView(false); setActiveTab('SHOP'); setSelectedCategory('Jeans'); }} 
              className={`transition-colors py-2 border-b-2 ${activeTab === 'SHOP' && selectedCategory === 'Jeans' ? 'text-orange-500 border-orange-500' : 'border-transparent hover:text-orange-500'}`}
            >
              Jeans
            </button>
            <button 
              onClick={() => { setShowAdminView(false); setActiveTab('SHOP'); setSelectedCategory('Trousers'); }} 
              className={`transition-colors py-2 border-b-2 ${activeTab === 'SHOP' && selectedCategory === 'Trousers' ? 'text-orange-500 border-orange-500' : 'border-transparent hover:text-orange-500'}`}
            >
              Trousers
            </button>
            <button 
              onClick={() => { setShowAdminView(false); setActiveTab('SHOP'); setSelectedCategory('Accessories'); }} 
              className={`transition-colors py-2 border-b-2 ${activeTab === 'SHOP' && selectedCategory === 'Accessories' ? 'text-orange-500 border-orange-500' : 'border-transparent hover:text-orange-500'}`}
            >
              Accessories
            </button>
          </nav>

          {/* RIGHT CTA UTILITY BOX */}
          <div className="flex items-center gap-3">
            {/* Search input - redirects to shop tab */}
            <div className="relative hidden lg:block w-40">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-neutral-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                id="search-box-nav"
                type="text"
                placeholder="Search styles..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'SHOP') {
                    setActiveTab('SHOP');
                  }
                }}
                className="w-full pl-8 pr-3 py-1.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
              />
            </div>

            {/* Dark Mode toggle */}
            <button 
              id="theme-toggle-btn"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-full transition-all"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Wishlist Hearts */}
            <button
              id="nav-wishlist-btn"
              onClick={() => setActiveTab('WISHLIST')}
              className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-full transition-all relative"
              title="Your Wishlist"
            >
              <Heart className={`w-4 h-4 ${wishlist.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
              {wishlist.length > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Shopping bags cart (Now maps to CHECKOUT tab) */}
            <button
              id="nav-cart-btn"
              onClick={() => setActiveTab('CHECKOUT')}
              className="hidden md:block bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 p-2 rounded-full hover:scale-105 transition-all relative shadow-sm"
              title="View Shopping Bag"
            >
              <ShoppingBag className="w-4 h-4" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-950">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </button>

            {/* Auth / Account (Maps to ACCOUNT tab) */}
            {user ? (
              <div className="flex items-center gap-2 border-l border-neutral-200 pl-2">
                <button
                  id="nav-account-btn"
                  onClick={() => setActiveTab('ACCOUNT')}
                  className="bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 p-2 rounded-full transition-colors"
                  title="Your Account"
                >
                  <User className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="nav-login-btn"
                onClick={() => setActiveTab('ACCOUNT')}
                className="bg-neutral-950 hover:bg-neutral-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
              >
                Sign In
              </button>
            )}

            {/* ADMIN ROUTER CONTROLLER TOGGLER */}
            {isAdmin && (
              <button
                id="admin-view-toggle"
                onClick={() => setShowAdminView(!showAdminView)}
                className="bg-orange-100 hover:bg-orange-200 text-orange-950 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 border border-orange-200"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                {showAdminView ? "Store Front" : "Admin Panel"}
              </button>
            )}

          </div>
        </div>

        {/* MOBILE MENU PANEL */}
        {mobileMenuOpen && (
          <div id="mobile-menu-drawer" className="md:hidden border-t border-neutral-100 dark:border-neutral-900 p-4 space-y-4 bg-white dark:bg-neutral-950 text-left">
            <div className="flex flex-col gap-3 font-bold text-sm text-neutral-800 dark:text-neutral-200">
              <button onClick={() => { setShowAdminView(false); setActiveTab('HOME'); setMobileMenuOpen(false); }} className="hover:text-orange-500 text-left py-1">Home</button>
              <button onClick={() => { setShowAdminView(false); setActiveTab('SHOP'); setSelectedCategory('All'); setMobileMenuOpen(false); }} className="hover:text-orange-500 text-left py-1">All Collections</button>
              <button onClick={() => { setShowAdminView(false); setActiveTab('SHOP'); setSelectedCategory('Shirts'); setMobileMenuOpen(false); }} className="hover:text-orange-500 text-left py-1">Shirts</button>
              <button onClick={() => { setShowAdminView(false); setActiveTab('SHOP'); setSelectedCategory('T-Shirts'); setMobileMenuOpen(false); }} className="hover:text-orange-500 text-left py-1">T-Shirts</button>
              <button onClick={() => { setShowAdminView(false); setActiveTab('SHOP'); setSelectedCategory('Jeans'); setMobileMenuOpen(false); }} className="hover:text-orange-500 text-left py-1">Jeans</button>
              <button onClick={() => { setShowAdminView(false); setActiveTab('SHOP'); setSelectedCategory('Trousers'); setMobileMenuOpen(false); }} className="hover:text-orange-500 text-left py-1">Trousers</button>
              <button onClick={() => { setShowAdminView(false); setActiveTab('SHOP'); setSelectedCategory('Accessories'); setMobileMenuOpen(false); }} className="hover:text-orange-500 text-left py-1">Accessories</button>
            </div>
          </div>
        )}
      </header>

      {/* 3. CONDITIONAL VIEWS: ADMIN DASHBOARD VS. CUSTOMER STOREFRONT */}
      <main id="app-viewport-container">
        
        {loading ? (
          <div id="loading-spinner-view" className="flex flex-col items-center justify-center py-40 space-y-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-black text-neutral-500 uppercase tracking-widest">Loading Rightnow Fashion Catalog...</p>
          </div>
        ) : showAdminView && isAdmin ? (
          // RENDER ADMIN PANEL
          <AdminPanel 
            allProducts={products}
            allOrders={orders}
            allCoupons={coupons}
            onRefreshData={loadDatabaseRecords}
          />
        ) : (
          // RENDER CUSTOMER STOREFRONT WITH DYNAMIC TABS
          <div className="pb-24">
            
            {/* TAB 1: HOME */}
            {activeTab === 'HOME' && (
              <div className="space-y-16 animate-fadeIn">
                {/* 3.1 HERO CAROUSEL */}
                <section id="hero-slider" className="relative aspect-[16/9] md:aspect-[21/9] bg-neutral-900 overflow-hidden shrink-0">
                  {HERO_SLIDES.map((slide, idx) => {
                    const isActive = idx === activeHeroIdx;
                    return (
                      <div
                        key={idx}
                        className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                          isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
                        }`}
                      >
                        {/* Shadow overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10"></div>
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="w-full h-full object-cover object-center"
                        />

                        {/* Banner Content block */}
                        <div className="absolute inset-y-0 left-0 max-w-7xl mx-auto px-6 md:px-12 flex flex-col justify-center z-20 text-white text-left space-y-4 md:space-y-6">
                          <span className="text-orange-500 text-xs font-black uppercase tracking-widest bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full w-max">
                            Premium Men's Couture Collection
                          </span>
                          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight uppercase max-w-xl">
                            {slide.title}
                          </h2>
                          <p className="text-xs sm:text-sm text-neutral-300 max-w-md font-medium leading-relaxed">
                            {slide.sub}
                          </p>
                          
                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            <button
                              id={`hero-shop-btn-${idx}`}
                              onClick={() => {
                                setSelectedCategory('All');
                                setActiveTab('SHOP');
                              }}
                              className="bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                            >
                              Explore Shop Now
                            </button>
                            <button
                              id={`hero-visit-btn-${idx}`}
                              onClick={() => {
                                const el = document.getElementById('contact-map-section');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                                else {
                                  setActiveTab('HOME');
                                  setTimeout(() => document.getElementById('contact-map-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
                                }
                              }}
                              className="bg-white hover:bg-neutral-100 text-neutral-950 font-black text-[10px] sm:text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                            >
                              Visit Store
                            </button>
                            <button
                              id={`hero-wa-btn-${idx}`}
                              onClick={() => window.open(`https://wa.me/919994780828?text=Hello%20Rightnow%20Garments!%20I%20want%20to%20place%20a%20whatsapp%20fashion%20order.`, '_blank')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1"
                            >
                              WhatsApp Order
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Slider Dots */}
                  <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                    {HERO_SLIDES.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveHeroIdx(i)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          i === activeHeroIdx ? 'bg-orange-500 w-6' : 'bg-white/50 hover:bg-white'
                        }`}
                      ></button>
                    ))}
                  </div>
                </section>

                {/* ARCHED CARDS (2x2 GRID - ALIGNS WITH SCREENSHOTS REFERENCE) */}
                <section className="max-w-7xl mx-auto px-4 md:px-8 text-center space-y-8">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                      Seasonal Curation
                    </span>
                    <h3 className="text-3xl md:text-4xl font-serif-display text-neutral-950 dark:text-white">
                      Shop by Category Edits
                    </h3>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto">
                      Explore our precision-crafted menswear categories, built with custom premium blends for exceptional fit.
                    </p>
                  </div>

                  {/* 2x2 Arched Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
                    {[
                      {
                        title: "Premium Linen",
                        category: "Shirts",
                        image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80",
                        tagline: "Breezy Spread Collar"
                      },
                      {
                        title: "Street Oversized",
                        category: "T-Shirts",
                        image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
                        tagline: "240 GSM Heavy Knit"
                      },
                      {
                        title: "Selvedge Raw",
                        category: "Jeans",
                        image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&auto=format&fit=crop&q=80",
                        tagline: "Traditional Shuttle Loom"
                      },
                      {
                        title: "Tailored Smart",
                        category: "Trousers",
                        image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80",
                        tagline: "Modern Pleated Comfort"
                      }
                    ].map((card, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedCategory(card.category);
                          setActiveTab('SHOP');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="group cursor-pointer space-y-3"
                      >
                        {/* Arched image container */}
                        <div className="arch-card-clip aspect-[3/4] overflow-hidden bg-neutral-100 border border-neutral-100 dark:border-neutral-900 shadow-xs group-hover:shadow-lg transition-all duration-300 relative">
                          <img
                            src={card.image}
                            alt={card.title}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-white text-neutral-950 font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                              View Catalog <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="text-center">
                          <span className="text-[9px] uppercase font-black text-orange-500 tracking-wider">
                            {card.tagline}
                          </span>
                          <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 uppercase tracking-tight group-hover:text-orange-500 transition-colors">
                            {card.title}
                          </h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>


                {/* 3.3 WHY CHOOSE US */}
                <section id="why-choose-us" className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                  {[
                    { title: 'Premium Quality', desc: '100% Cotton & Linen' },
                    { title: 'Affordable Prices', desc: 'True Direct Store Value' },
                    { title: 'Latest Fashion', desc: 'Snitch & Zara Inspired' },
                    { title: 'Easy Returns', desc: '7-Days Smooth Exchange' },
                    { title: 'Secure UPI Payments', desc: 'Screenshots Verification' },
                    { title: 'Fast Delivery', desc: 'Dispatched from Trichy' },
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-900 rounded-2xl text-left space-y-1">
                      <span className="text-orange-500 font-black text-sm block">0{idx+1}</span>
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-neutral-100">{item.title}</h4>
                      <p className="text-[10px] text-neutral-400 leading-tight">{item.desc}</p>
                    </div>
                  ))}
                </section>

                {/* 3.6 STORE INFORMATION SECTION (Embedded Maps and Address) */}
                <section id="contact-map-section" className="max-w-7xl mx-auto px-4 md:px-8 shrink-0">
                  <div className="bg-neutral-950 text-white rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-xl border border-neutral-900">
                    
                    {/* Embedded Map Panel (7 cols) */}
                    <div className="lg:col-span-7 h-80 lg:h-auto min-h-[300px] relative">
                      <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.790938448777!2d78.6859592!3d10.8273415!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3baaf506ea4a9cc5%3A0xe54e17ea47eb0bd0!2sFort%20Station%20Rd%2C%20Tiruchirappalli%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1719694436521!5m2!1sen!2sin"
                        className="w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-500"
                        allowFullScreen={false}
                        loading="lazy"
                        title="Rightnow Garments Location Map"
                      ></iframe>
                    </div>

                    {/* Local Address & contact block (5 cols) */}
                    <div className="lg:col-span-5 p-8 md:p-10 text-left space-y-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <span className="text-xs font-black uppercase text-orange-500 tracking-widest bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full w-max inline-block">
                          Tiruchirappalli Headquarters
                        </span>
                        <h3 className="text-2xl font-black uppercase tracking-tight leading-tight">
                          Visit Our Physical Outlet Store
                        </h3>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Experience the luxury drape of linen, evaluate accurate waist sizing for selvedge denim, and grab local exclusive combo deals in Trichy, Tamil Nadu.
                        </p>
                      </div>

                      <div className="space-y-3.5 text-xs">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-neutral-300 block mb-0.5">Physical Store Address</span>
                            <p className="text-neutral-400">Back Side Entrance, Fort Station Road, North East Extension, Tennur, Tiruchirappalli, Tamil Nadu 620018</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-orange-500 shrink-0" />
                          <div>
                            <span className="font-bold text-neutral-300 block">Phone Order Hotline</span>
                            <a href="tel:+919994780828" className="text-orange-400 hover:underline font-extrabold">+91 99947 80828</a>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                          <div>
                            <span className="font-bold text-neutral-300 block">Outlet Store Timings</span>
                            <p className="text-neutral-400">10:00 AM - 09:30 PM (Mon - Sun open daily)</p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => window.open(`https://wa.me/919994780828?text=Hello%20Rightnow%20Garments!%20I%20want%20to%20visit%20your%20store%20in%20Tennur.`, '_blank')}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4 text-white" />
                        Ping on WhatsApp Map
                      </button>
                    </div>

                  </div>
                </section>

                {/* 3.7 GOOGLE REVIEWS INTEGRATION & TESTIMONIALS */}
                <section id="google-reviews" className="max-w-7xl mx-auto px-4 md:px-8 space-y-6 text-left">
                  <div>
                    <h3 className="text-sm font-black text-neutral-950 dark:text-white uppercase tracking-wider">Verified Local Client Google Reviews</h3>
                    <p className="text-xs text-neutral-400">100% real reviews from verified Trichy buyers on Google Business Profiles</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { name: 'Saran Raj', rate: 5, comment: 'Hands down the best oversized t-shirts in Trichy! Thick premium 240 GSM organic cotton fabric, washes extremely well without color fading.' },
                      { name: 'Karthik Subramanian', rate: 5, comment: 'Excellent linen collection. Premium material quality matching Rare Rabbit or Zara, but at half the price tag. Customer support is superb too.' },
                      { name: 'Naveen Prasath', rate: 4.8, comment: 'Very straightforward checkout and ordering process. Did the UPI QR scan, uploaded screenshot proof, and got my jeans delivered next-day in Tennur.' }
                    ].map((testi, i) => (
                      <div key={i} className="p-5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-900 rounded-2xl space-y-3 relative">
                        <span className="absolute top-4 right-5 text-neutral-300 dark:text-neutral-700 text-3xl font-serif">“</span>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center">
                            {testi.name[0]}
                          </div>
                          <div>
                            <span className="font-extrabold text-xs text-neutral-900 dark:text-neutral-100 block">{testi.name}</span>
                            <span className="text-[9px] text-neutral-400 block font-bold">Local Guide • Trichy</span>
                          </div>
                        </div>
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map((st) => (
                            <Star key={st} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 italic leading-relaxed">
                          "{testi.comment}"
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 3.8 STYLE INSTAGRAM FEED MOCKUP */}
                <section id="instagram-feed" className="max-w-7xl mx-auto px-4 md:px-8 space-y-4 text-left">
                  <div>
                    <h3 className="text-sm font-black text-neutral-950 dark:text-white uppercase tracking-wider">Our Style Ledger Feed</h3>
                    <p className="text-xs text-neutral-400">Join the Rightnow movement with tag @Rightnow_Garments</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {[
                      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=500&auto=format&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&auto=format&fit=crop&q=80",
                    ].map((feedImg, idx) => (
                      <div key={idx} className="aspect-square bg-neutral-100 rounded-xl overflow-hidden relative group">
                        <img src={feedImg} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider">
                          View Post
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* TAB 2: SHOP CATALOG */}
            {activeTab === 'SHOP' && (
              <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto px-4 md:px-8 mt-6">
                
                {/* Category Circle Buttons */}
                <div className="flex gap-3 overflow-x-auto py-2 scrollbar-none justify-start md:justify-center shrink-0">
                  {categoriesList.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setSelectedSubCategory('All'); }}
                      className={`px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-wider border-2 transition-all shrink-0 ${
                        selectedCategory === cat
                          ? 'border-neutral-950 dark:border-white bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]'
                          : 'border-neutral-100 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Full Width Elegant Top Filters Bar */}
                <div className="bg-neutral-50 dark:bg-neutral-900/40 p-5 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 space-y-4 shadow-sm">
                  {/* Row 1: Search & Reset */}
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search premium garments, styles, materials..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-950 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white font-medium"
                      />
                    </div>
                    
                    {/* Active Filters Summary & Reset */}
                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <span className="text-xs text-neutral-500">
                        Found <strong className="text-neutral-800 dark:text-neutral-200 font-extrabold">{filteredCatalog.length}</strong> premium styles
                      </span>
                      {(selectedCategory !== 'All' || selectedBrand !== 'All' || selectedSize !== 'All' || selectedOccasion !== 'All' || searchQuery !== '' || priceRange < 5000) && (
                        <button
                          onClick={() => {
                            setSelectedCategory('All');
                            setSelectedSubCategory('All');
                            setSelectedBrand('All');
                            setSelectedSize('All');
                            setSelectedOccasion('All');
                            setPriceRange(5000);
                            setSortOption('Popularity');
                            setSearchQuery('');
                          }}
                          className="text-xs font-black text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Selector Menus */}
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-neutral-200/50 dark:border-neutral-800/50">
                    
                    {/* Size Selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Size:</span>
                      <select
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className="p-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs rounded-lg text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-orange-500 font-bold"
                      >
                        {sizesList.map(size => (
                          <option key={size} value={size}>{size === 'All' ? 'All Sizes' : `Size: ${size}`}</option>
                        ))}
                      </select>
                    </div>

                    {/* Brand Selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Brand:</span>
                      <select
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                        className="p-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs rounded-lg text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-orange-500 font-bold"
                      >
                        <option value="All">All Brands</option>
                        {brandsList.filter(b => b !== 'All').map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    {/* Occasion Selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Occasion:</span>
                      <select
                        value={selectedOccasion}
                        onChange={(e) => setSelectedOccasion(e.target.value)}
                        className="p-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs rounded-lg text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-orange-500 font-bold"
                      >
                        <option value="All">All Occasions</option>
                        <option value="Casual">Casual</option>
                        <option value="Formal">Formal</option>
                        <option value="Festival">Festival</option>
                      </select>
                    </div>

                    {/* Price Range Slider */}
                    <div className="flex items-center gap-2 bg-white dark:bg-neutral-950 px-3.5 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                      <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Max Price:</span>
                      <input
                        type="range"
                        min="500"
                        max="5000"
                        step="100"
                        value={priceRange}
                        onChange={(e) => setPriceRange(Number(e.target.value))}
                        className="w-20 sm:w-28 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">₹{priceRange}</span>
                    </div>

                    {/* Sort Selector */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Sort By:</span>
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="p-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs rounded-lg text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-orange-500 font-bold"
                      >
                        <option value="Popularity">Most Popular</option>
                        <option value="Newest">Newest Arrivals</option>
                        <option value="PriceLowHigh">Price: Low to High</option>
                        <option value="PriceHighLow">Price: High to Low</option>
                      </select>
                    </div>

                  </div>
                </div>

                {/* Product Catalog Grid - Full Width Spanning */}
                {filteredCatalog.length === 0 ? (
                  <div id="no-results-catalog" className="text-center py-20 bg-neutral-50 dark:bg-neutral-900 rounded-[24px] border border-neutral-100 dark:border-neutral-850 space-y-3">
                    <p className="font-extrabold text-neutral-700 dark:text-neutral-300">No premium garments match your filter matrix</p>
                    <p className="text-xs text-neutral-400">Try loosening your price sliders or selecting "All" categories.</p>
                  </div>
                ) : (
                  <div id="product-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                    {filteredCatalog.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onQuickView={handleOpenPDP}
                        onAddToCart={handleAddToCart}
                        onBuyNow={handleBuyNow}
                        onToggleWishlist={handleToggleWishlist}
                        isWishlisted={wishlist.some(p => p.id === product.id)}
                      />
                    ))}
                  </div>
                )}

                {/* 3.5 RECENTLY VIEWED PRODUCTS */}
                {recentlyViewed.length > 0 && (
                  <section id="recently-viewed" className="text-left space-y-4 pt-6 border-t border-neutral-100 dark:border-neutral-900">
                    <div>
                      <h3 className="text-sm font-black text-neutral-950 dark:text-white uppercase tracking-wider">Recently Inspected Styles</h3>
                      <p className="text-xs text-neutral-400">Don't miss out on your favorite garments</p>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                      {recentlyViewed.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleOpenPDP(p)}
                          className="group cursor-pointer p-3 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-900 hover:border-neutral-200 w-44 shrink-0 transition-all flex items-center gap-3 animate-fadeIn"
                        >
                          <img src={p.images[0]} alt={p.name} className="w-10 h-13 object-cover rounded-lg shrink-0" />
                          <div className="min-w-0 text-left">
                            <h4 className="text-[11px] font-bold text-neutral-850 dark:text-neutral-200 line-clamp-1 group-hover:text-orange-500 transition-colors">
                              {p.name}
                            </h4>
                            <p className="text-[10px] font-black text-neutral-950 dark:text-white mt-1">₹{p.offerPrice}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* TAB 3: SHOPPING BAG / LOGISTICS */}
            {activeTab === 'CHECKOUT' && (
              <div className="max-w-3xl mx-auto px-4 md:px-6 mt-6 animate-fadeIn text-left space-y-8">
                
                {/* Title and Subtitle */}
                <div className="border-b border-neutral-150 pb-4">
                  <h2 className="text-3xl font-black text-neutral-950 dark:text-white tracking-tight uppercase">
                    SHOPPING BAG
                  </h2>
                  <span className="text-[10px] font-black tracking-widest text-neutral-400 uppercase block mt-1">
                    LOGISTICS & ENVELOPE DETAILS
                  </span>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-24 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-900 p-8 space-y-4">
                    <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto" />
                    <p className="font-extrabold text-neutral-700 dark:text-neutral-300">Your shopping bag is empty</p>
                    <p className="text-xs text-neutral-400">Discover premium linen shirts, raw selvedge jeans, and accessories to elevate your style catalog.</p>
                    <button
                      onClick={() => setActiveTab('SHOP')}
                      className="bg-neutral-950 hover:bg-neutral-900 text-white font-black text-xs uppercase px-6 py-3 rounded-full transition-all"
                    >
                      Browse Store Collections
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Cart Items List */}
                    <div className="space-y-4">
                      {cart.map((item, index) => {
                        const productRef = `Ref: ${item.product.id.slice(5, 11).toUpperCase()}`;
                        return (
                          <div 
                            key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                            className="rounded-3xl border border-neutral-100 dark:border-neutral-900 p-5 bg-white dark:bg-neutral-900 flex flex-col sm:flex-row items-center gap-5 shadow-xs relative hover:shadow-md transition-all duration-300"
                          >
                            {/* Image (4:5 ratio) */}
                            <div className="w-24 aspect-[4/5] bg-neutral-50 dark:bg-neutral-950 rounded-xl overflow-hidden shrink-0">
                              <img 
                                src={item.product.images[0]} 
                                alt={item.product.name} 
                                className="w-full h-full object-cover" 
                              />
                            </div>

                            {/* Details */}
                            <div className="flex-grow space-y-2 text-center sm:text-left">
                              <div>
                                <span className="text-[10px] uppercase font-black text-neutral-400 tracking-wider">
                                  {item.product.brand}
                                </span>
                                <h4 className="font-extrabold text-sm text-neutral-900 dark:text-neutral-100 leading-tight">
                                  {item.product.name}
                                </h4>
                                <span className="text-[10px] text-neutral-400 block mt-0.5 font-mono">{productRef}</span>
                              </div>

                              {/* Capsules for properties */}
                              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                                  QTY: {item.quantity}
                                </span>
                                <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                                  SIZE: {item.selectedSize}
                                </span>
                                <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                                  COLOR: {item.selectedColor}
                                </span>
                              </div>

                              {/* Quantity adjustment */}
                              <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
                                <button
                                  onClick={() => handleUpdateCartQuantity(item.product.id, item.selectedSize, item.selectedColor, item.quantity - 1)}
                                  className="w-7 h-7 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                                >
                                  -
                                </button>
                                <span className="text-xs font-black">{item.quantity}</span>
                                <button
                                  onClick={() => handleUpdateCartQuantity(item.product.id, item.selectedSize, item.selectedColor, item.quantity + 1)}
                                  className="w-7 h-7 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Price / Delete Column */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800">
                              <span className="text-base font-black text-neutral-950 dark:text-white">
                                ₹{(item.product.offerPrice * item.quantity).toLocaleString('en-IN')}
                              </span>
                              <button
                                onClick={() => handleRemoveCartItem(item.product.id, item.selectedSize, item.selectedColor)}
                                className="p-2 text-red-500 bg-red-50 dark:bg-red-950/20 rounded-full hover:bg-red-100 transition-colors"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Coupons and totals checkout form integration */}
                    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-100 dark:border-neutral-800 space-y-6">
                      
                      {/* Active Coupons Helper */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                          Active Store Coupons
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {coupons.map((c) => (
                            <button
                              key={c.code}
                              onClick={() => {
                                setAppliedCoupon(c);
                                // Calculate subtotal
                                const sub = cart.reduce((acc, item) => acc + item.product.offerPrice * item.quantity, 0);
                                let dist = 0;
                                if (sub >= c.minPurchase) {
                                  if (c.discountType === 'percentage') {
                                    dist = Math.round((sub * c.value) / 100);
                                  } else {
                                    dist = c.value;
                                  }
                                  setDiscountAmount(dist);
                                  alert(`Applied Coupon ${c.code}! Discount of ₹${dist} applied successfully.`);
                                } else {
                                  alert(`Minimum purchase of ₹${c.minPurchase} is required for coupon ${c.code}. Add more items to bag!`);
                                }
                              }}
                              className={`text-[10px] font-black uppercase px-3 py-1.5 border rounded-full transition-all ${
                                appliedCoupon?.code === c.code
                                  ? 'bg-orange-500 text-white border-orange-500'
                                  : 'bg-white dark:bg-neutral-950 border-neutral-200 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                              }`}
                            >
                              {c.code}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pricing Tally Block */}
                      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Items Subtotal:</span>
                          <span className="font-extrabold text-neutral-800 dark:text-neutral-200">
                            ₹{cart.reduce((sum, item) => sum + item.product.offerPrice * item.quantity, 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        {appliedCoupon && (
                          <div className="flex justify-between text-emerald-600">
                            <span>Discount ({appliedCoupon.code}):</span>
                            <span>-₹{discountAmount}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-800 pt-3 text-sm">
                          <span className="font-black uppercase">Final Logistics Total:</span>
                          <span className="font-black text-base text-orange-500">
                            ₹{Math.max(0, cart.reduce((sum, item) => sum + item.product.offerPrice * item.quantity, 0) - discountAmount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* CTA navigation block */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                        <button
                          onClick={() => setActiveTab('SHOP')}
                          className="text-xs font-black uppercase text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5 py-2.5"
                        >
                          &lt; Continue Styles Shopping
                        </button>
                        
                        <button
                          onClick={() => setIsCheckoutOpen(true)}
                          className="bg-neutral-950 hover:bg-neutral-900 text-white w-full sm:w-auto px-8 py-3.5 rounded-full font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
                        >
                          Confirm Logistics Billing &gt;
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: WISHLIST */}
            {activeTab === 'WISHLIST' && (
              <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 animate-fadeIn text-left space-y-8">
                <div>
                  <h2 className="text-3xl font-black text-neutral-950 dark:text-white tracking-tight uppercase">
                    YOUR SAVED WISHLIST
                  </h2>
                  <span className="text-[10px] font-black tracking-widest text-neutral-400 uppercase block mt-1">
                    YOUR CURATED FAVORITE CLOTHES ({wishlist.length})
                  </span>
                </div>

                {wishlist.length === 0 ? (
                  <div className="text-center py-24 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-900 p-8 space-y-4 max-w-xl mx-auto">
                    <Heart className="w-12 h-12 text-neutral-300 mx-auto" />
                    <p className="font-extrabold text-neutral-700 dark:text-neutral-300">Your Wishlist is Empty</p>
                    <p className="text-xs text-neutral-400">Save your favorite custom shirts, polos, and selvedge jeans to keep track of premium items.</p>
                    <button
                      onClick={() => setActiveTab('SHOP')}
                      className="bg-neutral-950 hover:bg-neutral-900 text-white font-black text-xs uppercase px-6 py-3 rounded-full transition-all"
                    >
                      Browse Store Collections
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
                    {wishlist.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onQuickView={handleOpenPDP}
                        onAddToCart={handleAddToCart}
                        onBuyNow={handleBuyNow}
                        onToggleWishlist={handleToggleWishlist}
                        isWishlisted={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: ACCOUNT */}
            {activeTab === 'ACCOUNT' && (
              <div className="max-w-2xl mx-auto px-4 md:px-6 mt-6 animate-fadeIn text-left space-y-8">
                
                {/* Header */}
                <div>
                  <h2 className="text-3xl font-black text-neutral-950 dark:text-white tracking-tight uppercase">
                    USER PROFILE
                  </h2>
                  <span className="text-[10px] font-black tracking-widest text-neutral-400 uppercase block mt-1">
                    {user ? `WELCOME BACK, ${user.name}` : 'AUTHENTICATION CORNER'}
                  </span>
                </div>

                {!user ? (
                  <div className="bg-neutral-50 dark:bg-neutral-900 rounded-3xl p-6 md:p-8 border border-neutral-100 dark:border-neutral-800 text-center space-y-6">
                    <User className="w-12 h-12 text-neutral-400 mx-auto" />
                    <div className="space-y-2">
                      <h4 className="font-black text-lg uppercase tracking-tight">Login Required</h4>
                      <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                        Sign In or Register a new client account to track your live order dispatches, view invoice records, and claim premium vouchers!
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-full transition-all shadow-md inline-block"
                      >
                        Launch Authentication Panel
                      </button>
                    </div>

                    {/* Quick Demo Assist */}
                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs">
                      <p className="text-neutral-400 font-bold uppercase text-[9px] mb-2 tracking-widest">
                        Quick Demo Credentials Assistance
                      </p>
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => {
                            setIsAuthModalOpen(true);
                            // we can assist in UI
                          }}
                          className="bg-white dark:bg-neutral-950 border border-neutral-200 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:border-neutral-400 transition-colors"
                        >
                          Demo Customer Account
                        </button>
                        <button
                          onClick={() => {
                            setIsAuthModalOpen(true);
                          }}
                          className="bg-white dark:bg-neutral-950 border border-neutral-200 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:border-neutral-400 transition-colors"
                        >
                          Demo Owner Admin
                        </button>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="space-y-8">
                    
                    {/* Profile Information Card */}
                    <div className="bg-neutral-950 text-white rounded-3xl p-6 border border-neutral-900 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>
                      <div className="flex items-center gap-4 text-center sm:text-left z-10">
                        <div className="w-14 h-14 rounded-full bg-orange-500 text-white font-black text-lg flex items-center justify-center shadow-lg uppercase">
                          {user.name?.[0]}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-lg tracking-tight uppercase block">{user.name}</h4>
                          <span className="text-xs text-neutral-400 block">{user.email}</span>
                          <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full inline-block mt-1.5">
                            Verified Buyer
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2.5 z-10">
                        <button
                          onClick={handleLogout}
                          className="bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-colors border border-neutral-700"
                        >
                          Logout Session
                        </button>
                      </div>
                    </div>

                    {/* Order history section */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-black text-base uppercase tracking-tight">Your Order History Tracker</h3>
                        <span className="text-[10px] font-black text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-full uppercase">
                          {orders.filter(o => o.customerId === user.email).length} Total Orders
                        </span>
                      </div>

                      {orders.filter(o => o.customerId === user.email).length === 0 ? (
                        <div className="text-center py-16 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-900 p-6 space-y-2">
                          <p className="font-extrabold text-neutral-700 dark:text-neutral-300">No Orders Placed Yet</p>
                          <p className="text-xs text-neutral-400">Place an order using UPI payment and upload your receipt proof to begin.</p>
                          <button
                            onClick={() => setActiveTab('SHOP')}
                            className="bg-neutral-950 hover:bg-neutral-900 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-colors mt-2"
                          >
                            Browse Shop
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.filter(o => o.customerId === user.email).map((order) => (
                            <div
                              key={order.id}
                              className="bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800 p-5 rounded-3xl relative hover:border-neutral-300 transition-colors text-xs space-y-3.5"
                            >
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2.5">
                                <div>
                                  <span className="text-[10px] font-black text-neutral-400 uppercase">Order Reference</span>
                                  <p className="font-black text-neutral-950 dark:text-white text-sm">{order.orderNumber}</p>
                                </div>
                                <div className="text-left sm:text-right">
                                  <span className="text-[10px] font-black text-neutral-400 uppercase block">Created On</span>
                                  <span className="font-bold text-neutral-700 dark:text-neutral-300">{new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                              </div>

                              {/* Items mini list */}
                              <div className="space-y-2">
                                {order.items.map((item, i) => (
                                  <div key={i} className="flex items-center gap-3">
                                    <img src={item.image} alt={item.productName} className="w-8 h-10 object-cover rounded-md border border-neutral-100" />
                                    <div className="min-w-0 flex-grow text-left">
                                      <p className="font-extrabold text-[11px] text-neutral-900 dark:text-neutral-100 line-clamp-1">{item.productName}</p>
                                      <p className="text-[10px] text-neutral-400">Size: {item.selectedSize} • Color: {item.selectedColor} • Qty: {item.quantity}</p>
                                    </div>
                                    <span className="font-black text-neutral-950 dark:text-white">₹{item.price * item.quantity}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Status tracker */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-neutral-400 uppercase">Verification Status:</span>
                                  <span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-wider ${
                                    order.status === 'Payment Verification Pending'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : order.status === 'Cancelled'
                                      ? 'bg-red-100 text-red-800 border border-red-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="text-[10px] font-black text-neutral-400 uppercase block">Total Amount</span>
                                  <span className="font-black text-sm text-orange-500">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* 4. MASTER BOTTOM NAVIGATION BAR */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 h-16 flex justify-around items-center z-40 px-2 shadow-lg">
              {/* HOME tab */}
              <button 
                onClick={() => { setShowAdminView(false); setActiveTab('HOME'); }}
                className={`flex flex-col items-center justify-center w-14 h-12 transition-all ${activeTab === 'HOME' ? 'text-orange-500 scale-105' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                <Home className="w-5 h-5" />
                <span className="text-[9px] font-black tracking-widest uppercase mt-1">Home</span>
              </button>

              {/* SHOP tab */}
              <button 
                onClick={() => { setShowAdminView(false); setActiveTab('SHOP'); }}
                className={`flex flex-col items-center justify-center w-14 h-12 transition-all ${activeTab === 'SHOP' ? 'text-orange-500 scale-105' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                <Store className="w-5 h-5" />
                <span className="text-[9px] font-black tracking-widest uppercase mt-1">Shop</span>
              </button>

              {/* CHECKOUT tab */}
              <button 
                onClick={() => { setShowAdminView(false); setActiveTab('CHECKOUT'); }}
                className={`flex flex-col items-center justify-center w-14 h-12 transition-all relative ${activeTab === 'CHECKOUT' ? 'text-orange-500 scale-105' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                <ShoppingBag className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute top-1.5 right-2 bg-orange-500 text-white font-black text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-950">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)}
                  </span>
                )}
                <span className="text-[9px] font-black tracking-widest uppercase mt-1">Checkout</span>
              </button>

              {/* WISHLIST tab */}
              <button 
                onClick={() => { setShowAdminView(false); setActiveTab('WISHLIST'); }}
                className={`flex flex-col items-center justify-center w-14 h-12 transition-all relative ${activeTab === 'WISHLIST' ? 'text-orange-500 scale-105' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                {wishlist.length > 0 && (
                  <span className="absolute top-1.5 right-2 bg-red-500 text-white font-black text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-950">
                    {wishlist.length}
                  </span>
                )}
                <span className="text-[9px] font-black tracking-widest uppercase mt-1">Wishlist</span>
              </button>

              {/* ACCOUNT tab */}
              <button 
                onClick={() => { setShowAdminView(false); setActiveTab('ACCOUNT'); }}
                className={`flex flex-col items-center justify-center w-14 h-12 transition-all ${activeTab === 'ACCOUNT' ? 'text-orange-500 scale-105' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                <User className="w-5 h-5" />
                <span className="text-[9px] font-black tracking-widest uppercase mt-1">Account</span>
              </button>
            </div>

          </div>
        )}

      </main>

      {/* 4. MASTER FOOTER */}
      <footer id="about-us-section" className="bg-neutral-950 text-white pt-16 pb-8 border-t border-neutral-900">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
          
          <div className="space-y-4">
            <h4 className="font-black text-sm uppercase tracking-widest text-orange-500">Rightnow Garments</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              We engineer luxury and premium men's clothing with high-precision drapes, custom threads, and organic blends in Tiruchirappalli, Tamil Nadu.
            </p>
            <p className="text-[10px] text-neutral-500">
              © 2026 Rightnow Garments Store, Tennur. All Rights Reserved.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-black text-sm uppercase tracking-widest text-neutral-200">The Catalogues</h4>
            <div className="flex flex-col gap-2 text-xs text-neutral-400 font-medium">
              <button onClick={() => { setShowAdminView(false); setSelectedCategory('Shirts'); }} className="hover:text-orange-500 text-left">Linen & Printed Shirts</button>
              <button onClick={() => { setShowAdminView(false); setSelectedCategory('T-Shirts'); }} className="hover:text-orange-500 text-left">Oversized Mock-Tees</button>
              <button onClick={() => { setShowAdminView(false); setSelectedCategory('Jeans'); }} className="hover:text-orange-500 text-left">Japanese Selvedge Jeans</button>
              <button onClick={() => { setShowAdminView(false); setSelectedCategory('Trousers'); }} className="hover:text-orange-500 text-left">Pleated Cargo Pants</button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-black text-sm uppercase tracking-widest text-neutral-200">Merchant Policies</h4>
            <div className="flex flex-col gap-2 text-xs text-neutral-400 font-medium">
              <button onClick={() => alert('7-Days smooth size exchange policy. Return courier charges are fully covered by Rightnow Garments!')} className="hover:text-orange-500 text-left">Refund & Return Policy</button>
              <button onClick={() => alert('Free courier dispatch sitewide. Dispatches are made from Trichy Fort terminal within 24 hours of UPI screenshot verification!')} className="hover:text-orange-500 text-left">Shipping & Dispatches</button>
              <button onClick={() => alert('Your transaction payment screenshots and personal addresses are stored in encrypted cloud firestores securely.')} className="hover:text-orange-500 text-left">Encrypted Privacy Policy</button>
              <button onClick={() => alert('Terms & Conditions apply to coupons. Discounts are capped at maximum limit specified on each card.')} className="hover:text-orange-500 text-left">Terms & Conditions</button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-black text-sm uppercase tracking-widest text-neutral-200">Store Support</h4>
            <p className="text-xs text-neutral-400 leading-snug">
               Tennur Fort Station Road, Tiruchirappalli, TN, India
            </p>
            <p className="text-xs text-neutral-300">
              Email: <a href="mailto:support@rightnowgarments.com" className="hover:underline text-orange-400">adyah2310@gmail.com</a>
            </p>
            <p className="text-xs text-neutral-300">
              WhatsApp Support: <a href="https://wa.me/919994780828" className="hover:underline text-orange-400 font-bold">+91 99947 80828</a>
            </p>
          </div>

        </div>

        {/* Outer credit line */}
        <div className="border-t border-neutral-900 mt-12 pt-6 text-center text-[10px] text-neutral-600">
          Crafted for Rightnow Garments, Back Side Entrance, Fort Station Road, North East Extension, Tennur, Tiruchirappalli, Tamil Nadu 620018.
        </div>
      </footer>


      {/* 5. FLOATING DIALOGS & OVERLAYS & MODALS MANAGER */}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Cart Drawer */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={handleProceedToCheckout}
        availableCoupons={coupons}
      />

      {/* Checkout Form */}
      <CheckoutForm
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cart}
        appliedCoupon={appliedCoupon}
        discountAmount={discountAmount}
        userEmail={user?.email || ''}
        onOrderSuccess={handleOrderSuccess}
        onClearCart={() => setCart([])}
      />

      {/* PDP Modal */}
      <ProductDetailModal
        product={activeQuickViewProduct}
        isOpen={!!activeQuickViewProduct}
        onClose={() => setActiveQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onToggleWishlist={handleToggleWishlist}
        isWishlisted={activeQuickViewProduct ? wishlist.some(p => p.id === activeQuickViewProduct.id) : false}
        allProducts={products}
        onSelectProduct={handleOpenPDP}
      />

      {/* User Order History Modal */}
      <OrderHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        orders={orders.filter(o => o.customerId === user?.email)}
      />

      {/* PLACED ORDER FEEDBACK POPUP/MODAL */}
      {lastPlacedOrder && (
        <div id="order-success-overlay" className="fixed inset-0 bg-black/80 backdrop-blur-md z-55 flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 p-8 rounded-3xl text-center max-w-md w-full space-y-6 border border-neutral-100 shadow-2xl relative animate-bounceIn">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-neutral-950 uppercase tracking-tight">Order Placed Successfully!</h3>
              <p className="text-xs text-neutral-500">
                Your payment screenshot proof of <strong className="text-orange-500">₹{lastPlacedOrder.totalAmount.toLocaleString('en-IN')}</strong> has been submitted.
              </p>
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60 text-xs text-left space-y-1.5 font-medium text-neutral-700">
              <p><strong>Order Reference:</strong> {lastPlacedOrder.orderNumber}</p>
              <p><strong>Status:</strong> <span className="text-red-500 font-extrabold">{lastPlacedOrder.status}</span></p>
              <p><strong>Delivery Address:</strong> {lastPlacedOrder.shippingAddress.address}, {lastPlacedOrder.shippingAddress.city}</p>
              <p className="text-[10px] text-neutral-400 italic pt-1 text-center">
                Our merchant admin is verifying your UPI payment transfer now.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setLastPlacedOrder(null);
                  setIsHistoryOpen(true); // show tracker
                }}
                className="w-full bg-neutral-950 hover:bg-neutral-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Track Live Order Dispatches
              </button>
              <button
                onClick={() => setLastPlacedOrder(null)}
                className="w-full border border-neutral-200 hover:bg-neutral-50 text-neutral-600 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
