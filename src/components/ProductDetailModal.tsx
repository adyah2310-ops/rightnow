import React, { useState, useRef } from 'react';
import { X, Heart, Star, ShoppingBag, MessageSquare, Share2, Check, HelpCircle, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { Product } from '../types';
import ProductCard from './ProductCard';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, size: string, color: string, quantity: number) => void;
  onBuyNow: (product: Product, size: string, color: string, quantity: number) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: boolean;
  wishlist: Product[];
  allProducts: Product[];
  onSelectProduct: (product: Product) => void;
}

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  isWishlisted,
  wishlist,
  allProducts,
  onSelectProduct
}: ProductDetailModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});
  const [isHovered, setIsHovered] = useState(false);

  // Carousel scroll refs
  const relatedScrollRef = useRef<HTMLDivElement>(null);
  const exploreScrollRef = useRef<HTMLDivElement>(null);
  const trendingScrollRef = useRef<HTMLDivElement>(null);

  const handleCarouselScroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const amt = direction === 'left' ? -320 : 320;
      ref.current.scrollBy({ left: amt, behavior: 'smooth' });
    }
  };

  // New review state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [localReviews, setLocalReviews] = useState<Array<{name: string, rating: number, comment: string, date: string}>>([
    { name: 'Arun Kumar', rating: 5, comment: 'Exceptional linen quality! The stitch is robust and looks super premium. Highly recommend from Tiruchirappalli.', date: '2026-06-15' },
    { name: 'Vignesh S.', rating: 4, comment: 'Fits really well. Premium packaging and fast delivery. Rightnow garments is my new go-to store.', date: '2026-06-21' }
  ]);

  if (!isOpen || !product) return null;

  // Set initial selections
  if (!selectedSize && product.sizes.length > 0) {
    setSelectedSize(product.sizes[0]);
  }
  if (!selectedColor && product.colors.length > 0) {
    setSelectedColor(product.colors[0]);
  }

  const discount = Math.round(((product.price - product.offerPrice) / product.price) * 100);

  // --- Smart Recommendation Logic ---
  const otherProducts = allProducts.filter(p => p.id !== product.id);

  // Priority 1: Products from same category
  const sameCategoryProducts = otherProducts.filter(p => p.category === product.category);
  const sortedRelated = [...sameCategoryProducts].sort((a, b) => {
    const scoreA = (a.isBestSeller ? 4 : 0) + (a.isNewArrival ? 3 : 0) + (a.isTrending ? 2 : 0);
    const scoreB = (b.isBestSeller ? 4 : 0) + (b.isNewArrival ? 3 : 0) + (b.isTrending ? 2 : 0);
    return scoreB - scoreA;
  });

  // Priority 2: Products from other categories (Explore More Collections)
  const otherCategoryProducts = otherProducts.filter(p => p.category !== product.category);
  const sortedExplore = [...otherCategoryProducts].sort((a, b) => {
    const scoreA = (a.isBestSeller ? 4 : 0) + (a.isNewArrival ? 3 : 0) + (a.isTrending ? 2 : 0);
    const scoreB = (b.isBestSeller ? 4 : 0) + (b.isNewArrival ? 3 : 0) + (b.isTrending ? 2 : 0);
    return scoreB - scoreA;
  });

  // Priority 3: Trending / Best Seller products
  const trendingProducts = otherProducts.filter(p => p.isTrending || p.isBestSeller || p.ratings >= 4.5);
  const sortedTrending = [...trendingProducts].sort((a, b) => b.ratings - a.ratings);

  const handleProductSelect = (p: Product) => {
    onSelectProduct(p);
    setActiveImageIndex(0);
    setSelectedSize(p.sizes[0] || '');
    setSelectedColor(p.colors[0] || '');
    setQuantity(1);
    
    // Smooth scroll the modal container back to the top
    const modalContent = document.getElementById('pdp-modal-content');
    if (modalContent) {
      modalContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle Image Zoom on Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(1.8)'
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({});
    setIsHovered(false);
  };

  const handleShare = () => {
    const shareText = `Check out this premium ${product.name} from Rightnow Garments!\nPrice: ₹${product.offerPrice}\nLink: ${window.location.href}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppEnquiry = () => {
    const message = encodeURIComponent(
      `Hello Rightnow Garments! I am interested in purchasing:\n\n*Product*: ${product.name}\n*Brand*: ${product.brand}\n*Price*: ₹${product.offerPrice}\n*Size*: ${selectedSize}\n*Color*: ${selectedColor}\n\nCan you please confirm availability? Thank you!`
    );
    window.open(`https://wa.me/919994780828?text=${message}`, '_blank');
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const newRev = {
      name: 'You (Verified Buyer)',
      rating: newRating,
      comment: newComment,
      date: new Date().toISOString().split('T')[0]
    };
    setLocalReviews([newRev, ...localReviews]);
    setNewComment('');
  };

  // Size recommender tool
  const recommendSize = (heightInCm: number, weightInKg: number) => {
    if (weightInKg < 60) return 'S';
    if (weightInKg < 70) return 'M';
    if (weightInKg < 80) return 'L';
    if (weightInKg < 90) return 'XL';
    return 'XXL';
  };

  return (
    <div id="pdp-modal-overlay" className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4">
      <div 
        id="pdp-modal-container"
        className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] md:rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300"
      >
        {/* Top styling bar */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-neutral-950 to-orange-500 shrink-0"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <span className="text-xs font-black uppercase text-neutral-400 tracking-widest">
            Product Quick View & Details
          </span>
          <button 
            id="pdp-close-btn"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors p-1 bg-neutral-100 dark:bg-neutral-800 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-grow overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* LEFT SIDE: Image Gallery */}
            <div className="space-y-4">
              {/* Large Zoomable Main Image */}
              <div 
                id="pdp-main-image-container"
                className="relative aspect-[3/4] bg-neutral-50 dark:bg-neutral-950 rounded-xl overflow-hidden border border-neutral-100 dark:border-neutral-800 cursor-zoom-in"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onMouseEnter={() => setIsHovered(true)}
              >
                <img
                  id="pdp-main-image"
                  src={product.images[activeImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover object-center transition-transform duration-100 ease-out"
                  style={isHovered ? zoomStyle : {}}
                />

                {/* Left/Right controls */}
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-neutral-900/85 p-1.5 rounded-full shadow-md text-neutral-800 dark:text-neutral-100 hover:bg-white dark:hover:bg-neutral-800 transition-all hover:scale-110"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-neutral-900/85 p-1.5 rounded-full shadow-md text-neutral-800 dark:text-neutral-100 hover:bg-white dark:hover:bg-neutral-800 transition-all hover:scale-110"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Tags */}
                {discount > 0 && (
                  <span className="absolute top-4 left-4 bg-orange-500 text-white font-black text-xs tracking-wider uppercase px-2.5 py-1 rounded-sm shadow-md">
                    {discount}% OFF
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div id="pdp-thumbnails" className="flex gap-2.5 overflow-x-auto py-1 scrollbar-none">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative aspect-[3/4] w-16 bg-neutral-50 dark:bg-neutral-950 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                        idx === activeImageIndex ? 'border-orange-500 shadow-sm' : 'border-neutral-200 dark:border-neutral-800 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`${product.name} preview ${idx}`} className="w-full h-full object-cover object-center" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT SIDE: Product details and purchasing parameters */}
            <div className="space-y-6">
              {/* Product Header Info */}
              <div>
                <p className="text-xs font-black uppercase text-orange-500 tracking-wider mb-1">{product.brand}</p>
                <h1 id="pdp-title" className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight mb-2">
                  {product.name}
                </h1>

                {/* Ratings & Category */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span className="font-black text-neutral-800 dark:text-neutral-200">{product.ratings}</span>
                    <span className="text-neutral-400 text-xs font-medium">({product.reviewCount} Ratings)</span>
                  </div>
                  <span className="text-neutral-300 dark:text-neutral-700">|</span>
                  <span className="text-neutral-500 dark:text-neutral-400 font-semibold">{product.subCategory}</span>
                </div>
              </div>

              {/* Price Row */}
              <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl flex items-baseline gap-3 border border-neutral-100 dark:border-neutral-850">
                <span className="text-3xl font-black text-neutral-950 dark:text-white">₹{product.offerPrice.toLocaleString('en-IN')}</span>
                {product.price > product.offerPrice && (
                  <>
                    <span className="text-lg text-neutral-400 line-through font-medium">₹{product.price.toLocaleString('en-IN')}</span>
                    <span className="text-sm font-black text-orange-500 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400 px-2 py-0.5 rounded">
                      Save ₹{(product.price - product.offerPrice).toLocaleString('en-IN')}
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider mb-2">The Collection Note</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">{product.description}</p>
              </div>

              {/* Size Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">Select Available Size</h3>
                  <button 
                    onClick={() => setShowSizeChart(!showSizeChart)}
                    className="text-xs text-orange-500 font-bold hover:underline flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Size Guide
                  </button>
                               {/* Size Selector Grid */}
                <div id="pdp-size-selector" className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-12 h-10 px-3 rounded-lg border-2 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center ${
                        selectedSize === size
                          ? 'border-neutral-950 bg-neutral-950 dark:border-white dark:bg-white text-white dark:text-black shadow-md'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-350 hover:border-neutral-400 dark:hover:border-neutral-600'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                {/* Size Guide Popover */}
                {showSizeChart && (
                  <div className="mt-3 p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2.5 animate-fadeIn">
                    <p className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase">Interactive Size Chart (Men's Tops/Bottoms)</p>
                    <div className="grid grid-cols-4 gap-1 text-[11px] text-center text-neutral-600 dark:text-neutral-400">
                      <div className="bg-neutral-200 dark:bg-neutral-800 py-1 font-bold">Size</div>
                      <div className="bg-neutral-200 dark:bg-neutral-800 py-1 font-bold">Chest (in)</div>
                      <div className="bg-neutral-200 dark:bg-neutral-800 py-1 font-bold">Waist (in)</div>
                      <div className="bg-neutral-200 dark:bg-neutral-800 py-1 font-bold">Length (in)</div>
                      
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1 font-bold">S</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">38</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">30</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">27.5</div>

                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1 font-bold">M</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">40</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">32</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">28.0</div>

                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1 font-bold">L</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">42</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">34</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">28.5</div>

                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1 font-bold">XL</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">44</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">36</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">29.0</div>

                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1 font-bold">XXL</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">46</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">38</div>
                      <div className="border-b border-neutral-100 dark:border-neutral-800 py-1">29.5</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Color Selection */}
              <div>
                <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider mb-2">Select Color Tone</h3>
                <div id="pdp-color-selector" className="flex gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded-lg border-2 font-bold text-xs transition-all ${
                        selectedColor === color
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-950 dark:text-orange-300 font-black'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-350 hover:border-neutral-400 dark:hover:border-neutral-600'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selector & Stock Status */}
              <div className="flex items-center justify-between gap-4 py-3 border-y border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase text-neutral-400 tracking-wider">Qty:</span>
                  <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors font-black text-sm"
                    >
                      -
                    </button>
                    <span className="px-4 py-1 font-bold text-sm text-neutral-900 dark:text-white">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      className="px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors font-black text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Stock Status */}
                <div className="text-right">
                  {product.stock > 0 ? (
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      {product.stock} Units In Stock
                    </span>
                  ) : (
                    <span className="text-xs font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-1 rounded-full">
                      Out Of Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Button Row */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="pdp-add-to-cart"
                    onClick={() => onAddToCart(product, selectedSize, selectedColor, quantity)}
                    disabled={product.stock === 0}
                    className="w-full border-2 border-neutral-950 dark:border-white text-neutral-950 dark:text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-neutral-50 dark:hover:bg-neutral-900 active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Add To Cart Bags
                  </button>
                  <button
                    id="pdp-buy-now"
                    onClick={() => onBuyNow(product, selectedSize, selectedColor, quantity)}
                    disabled={product.stock === 0}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-center transition-all active:scale-98 disabled:opacity-50 disabled:pointer-events-none shadow-md hover:shadow-lg"
                  >
                    Secure Buy Now
                  </button>
                </div>    </div>

                {/* WhatsApp & Social Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    id="pdp-whatsapp-enquiry"
                    onClick={handleWhatsAppEnquiry}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageCircle className="w-4.5 h-4.5 fill-white text-emerald-600" />
                    WhatsApp Ordering Enquiry
                  </button>
                  <div className="flex gap-2">
                    <button
                      id="pdp-wishlist-toggle"
                      onClick={() => onToggleWishlist(product)}
                      className="flex-1 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 p-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold text-neutral-700 dark:text-neutral-300"
                    >
                      <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                      {isWishlisted ? 'Wishlisted' : 'Save To Wish'}
                    </button>
                    <button
                      id="pdp-share-btn"
                      onClick={handleShare}
                      className="border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 p-3 rounded-xl flex items-center justify-center transition-all text-neutral-700 dark:text-neutral-300 font-bold text-xs"
                      title="Copy sharing link"
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      {copied ? 'Copied' : 'Share'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Technical Specifications Dropdown block */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xs font-black uppercase text-neutral-900 dark:text-white tracking-wider mb-3">Garment Specifications</h3>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                  <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-400">Material</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">{product.specifications.material}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-400">Garment Fit</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">{product.specifications.fit}</span>
                  </div>
                  {product.specifications.sleeve && (
                    <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                      <span className="text-neutral-400">Sleeve</span>
                      <span className="font-bold text-neutral-800 dark:text-neutral-200">{product.specifications.sleeve}</span>
                    </div>
                  )}
                  {product.specifications.neckline && (
                    <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                      <span className="text-neutral-400">Neckline</span>
                      <span className="font-bold text-neutral-800 dark:text-neutral-200">{product.specifications.neckline}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-400">Fabric Type</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">{product.specifications.fabric}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-400">Occasion Style</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 text-right">{product.specifications.occasion}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION: Customer Reviews & Ratings Form */}
          <div className="pt-8 border-t border-neutral-100 dark:border-neutral-800 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-neutral-950 dark:text-white tracking-tight">Verified Buyer Reviews</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Real thoughts and sizing reviews from Tamil Nadu</p>
              </div>

              {/* Quick Overall Stats */}
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/45 p-2.5 rounded-xl">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{product.ratings}</span>
                <div className="text-left leading-none">
                  <div className="flex text-amber-500 mb-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`w-3.5 h-3.5 fill-current ${star <= Math.floor(product.ratings) ? 'text-amber-500' : 'text-neutral-200 dark:text-neutral-800'}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-extrabold">{product.reviewCount} total reviews</span>
                </div>
              </div>
            </div>

            {/* List existing reviews */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localReviews.map((rev, i) => (
                <div key={i} className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-850 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">{rev.name}</span>
                    <span className="text-[10px] text-neutral-400">{rev.date}</span>
                  </div>
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 fill-current ${s <= rev.rating ? 'text-amber-500' : 'text-neutral-200 dark:text-neutral-800'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 italic leading-relaxed">"{rev.comment}"</p>
                </div>
              ))}
            </div>


          </div>

          {/* SECTIONS: Smart Product Recommendations */}
          {renderRecommendationSection(
            "You May Also Like",
            "Related Products in the same category pairing",
            sortedRelated.slice(0, 8),
            relatedScrollRef
          )}

          {renderRecommendationSection(
            "Explore More Collections",
            "Broaden your style with items from other premium categories",
            sortedExplore.slice(0, 8),
            exploreScrollRef
          )}

          {renderRecommendationSection(
            "Trending Products",
            "Best-selling customer favorites from Tiruchirappalli",
            sortedTrending.slice(0, 8),
            trendingScrollRef
          )}

        </div>
      </div>
    </div>
  );

  // Helper to render horizontally scrollable recommendation carousels with desktop navigation buttons
  function renderRecommendationSection(
    title: string,
    subtitle: string,
    productsList: Product[],
    scrollRef: React.RefObject<HTMLDivElement | null>
  ) {
    if (productsList.length === 0) return null;

    const handleCarouselScroll = (direction: 'left' | 'right') => {
      if (scrollRef.current) {
        const amt = direction === 'left' ? -320 : 320;
        scrollRef.current.scrollBy({ left: amt, behavior: 'smooth' });
      }
    };

    return (
      <div className="pt-8 border-t border-neutral-100 dark:border-neutral-800 space-y-4 relative group/carousel">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-sm font-black text-neutral-950 dark:text-white uppercase tracking-wider">{title}</h3>
            <p className="text-[11px] text-neutral-400">{subtitle}</p>
          </div>
          <div className="hidden md:flex gap-1.5">
            <button
              type="button"
              onClick={() => handleCarouselScroll('left')}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleCarouselScroll('right')}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-none gap-4 pb-4 snap-x snap-mandatory scroll-smooth"
        >
          {productsList.map((p) => (
            <div key={p.id} className="w-[180px] sm:w-[220px] shrink-0 snap-start">
              <ProductCard
                product={p}
                onAddToCart={(prod, sz, col) => {
                  const finalSize = sz || prod.sizes[0] || 'M';
                  const finalColor = col || prod.colors[0] || 'Black';
                  onAddToCart(prod, finalSize, finalColor, 1);
                }}
                onBuyNow={(prod, sz, col) => {
                  const finalSize = sz || prod.sizes[0] || 'M';
                  const finalColor = col || prod.colors[0] || 'Black';
                  onBuyNow(prod, finalSize, finalColor, 1);
                }}
                onQuickView={() => handleProductSelect(p)}
                onToggleWishlist={onToggleWishlist}
                isWishlisted={wishlist.some((item) => item.id === p.id)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
}
