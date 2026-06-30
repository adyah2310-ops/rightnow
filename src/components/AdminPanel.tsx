import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Order, Coupon } from '../types';
import { 
  BarChart, Layers, Inbox, Percent, AlertTriangle, Plus, Edit2, Trash2, 
  Check, X, Eye, FileText, TrendingUp, ShoppingCart, Users, CheckCircle, 
  Truck, PackageCheck, AlertCircle, ShoppingBag, XCircle, Search, RefreshCw 
} from 'lucide-react';

interface AdminPanelProps {
  allProducts: Product[];
  allOrders: Order[];
  allCoupons: Coupon[];
  onRefreshData: () => void;
}

export default function AdminPanel({
  allProducts,
  allOrders,
  allCoupons,
  onRefreshData
}: AdminPanelProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'orders' | 'coupons'>('analytics');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Selected order details modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Add/Edit product states
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productFormId, setProductFormId] = useState('');
  const [productName, setProductName] = useState('');
  const [productBrand, setProductBrand] = useState('Rightnow Garments');
  const [productCategory, setProductCategory] = useState('Shirts');
  const [productSubCategory, setProductSubCategory] = useState('Plain Shirts');
  const [productPrice, setProductPrice] = useState(1500);
  const [productOfferPrice, setProductOfferPrice] = useState(999);
  const [productImages, setProductImages] = useState<string[]>(['']);
  const [productSizes, setProductSizes] = useState<string[]>(['M', 'L', 'XL']);
  const [productColors, setProductColors] = useState<string[]>(['Black', 'White']);
  const [productStock, setProductStock] = useState(20);
  const [productDescription, setProductDescription] = useState('');
  
  // Specs
  const [specMaterial, setSpecMaterial] = useState('100% Premium Cotton');
  const [specFit, setSpecFit] = useState('Regular Fit');
  const [specSleeve, setSpecSleeve] = useState('Full Sleeve');
  const [specNeckline, setSpecNeckline] = useState('Spread Collar');
  const [specFabric, setSpecFabric] = useState('Cotton Twill');
  const [specOccasion, setSpecOccasion] = useState('Casual');

  // Badge Flags
  const [flagTrending, setFlagTrending] = useState(false);
  const [flagBestSeller, setFlagBestSeller] = useState(false);
  const [flagNewArrival, setFlagNewArrival] = useState(true);

  // Coupon form states
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState(10);
  const [couponMinPurchase, setCouponMinPurchase] = useState(1000);
  const [couponDesc, setCouponDesc] = useState('');

  // Submitting status
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

  // Reset product form
  const resetProductForm = () => {
    setIsEditingProduct(false);
    setProductFormId('');
    setProductName('');
    setProductBrand('Rightnow Garments');
    setProductCategory('Shirts');
    setProductSubCategory('Plain Shirts');
    setProductPrice(1500);
    setProductOfferPrice(999);
    setProductImages(['']);
    setProductSizes(['M', 'L', 'XL']);
    setProductColors(['Black', 'White']);
    setProductStock(20);
    setProductDescription('');
    setSpecMaterial('100% Premium Cotton');
    setSpecFit('Regular Fit');
    setSpecSleeve('Full Sleeve');
    setSpecNeckline('Spread Collar');
    setSpecFabric('Cotton Twill');
    setSpecOccasion('Casual');
    setFlagTrending(false);
    setFlagBestSeller(false);
    setFlagNewArrival(true);
  };

  // Trigger alert
  const triggerAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg({ type: '', text: '' }), 4000);
  };

  // Save or edit product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const imagesFiltered = productImages.filter(img => img.trim() !== '');
    if (imagesFiltered.length === 0) {
      triggerAlert('error', 'At least one product image URL is required.');
      setSubmitting(false);
      return;
    }

    const payload: Omit<Product, 'id'> = {
      name: productName,
      brand: productBrand,
      category: productCategory,
      subCategory: productSubCategory,
      price: Number(productPrice),
      offerPrice: Number(productOfferPrice),
      images: imagesFiltered,
      sizes: productSizes,
      colors: productColors,
      ratings: 4.5,
      reviewCount: 1,
      description: productDescription || `${productName} from Rightnow Garments, Tiruchirappalli.`,
      specifications: {
        material: specMaterial,
        fit: specFit,
        sleeve: specSleeve,
        neckline: specNeckline,
        fabric: specFabric,
        occasion: specOccasion
      },
      stock: Number(productStock),
      isTrending: flagTrending,
      isBestSeller: flagBestSeller,
      isNewArrival: flagNewArrival
    };

    try {
      if (productFormId) {
        // Edit existing product
        const docRef = doc(db, 'products', productFormId);
        await updateDoc(docRef, payload);
        triggerAlert('success', `Product "${productName}" updated successfully!`);
      } else {
        // Add new product
        const id = `prod_${Date.now()}`;
        await addDoc(collection(db, 'products'), { ...payload, id });
        triggerAlert('success', `Product "${productName}" created successfully!`);
      }
      resetProductForm();
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerAlert('error', 'Failed to save product in Firebase: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Fill form for editing
  const handleStartEdit = (product: Product) => {
    setIsEditingProduct(true);
    setProductFormId(product.id);
    setProductName(product.name);
    setProductBrand(product.brand);
    setProductCategory(product.category);
    setProductSubCategory(product.subCategory);
    setProductPrice(product.price);
    setProductOfferPrice(product.offerPrice);
    setProductImages(product.images.length > 0 ? product.images : ['']);
    setProductSizes(product.sizes);
    setProductColors(product.colors);
    setProductStock(product.stock);
    setProductDescription(product.description);
    setSpecMaterial(product.specifications.material);
    setSpecFit(product.specifications.fit);
    setSpecSleeve(product.specifications.sleeve || '');
    setSpecNeckline(product.specifications.neckline || '');
    setSpecFabric(product.specifications.fabric);
    setSpecOccasion(product.specifications.occasion);
    setFlagTrending(!!product.isTrending);
    setFlagBestSeller(!!product.isBestSeller);
    setFlagNewArrival(!!product.isNewArrival);
  };

  // Delete product
  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"? This is irreversible.`)) {
      return;
    }
    try {
      // Find doc in firestore where product ID matches
      const querySnapshot = await getDocs(collection(db, 'products'));
      let docIdToDelete = '';
      querySnapshot.forEach((doc) => {
        if (doc.data().id === product.id) {
          docIdToDelete = doc.id;
        }
      });

      if (docIdToDelete) {
        await deleteDoc(doc(db, 'products', docIdToDelete));
        triggerAlert('success', `Product "${product.name}" deleted from catalogue.`);
        onRefreshData();
      } else {
        triggerAlert('error', 'Could not locate document in database.');
      }
    } catch (err: any) {
      console.error(err);
      triggerAlert('error', 'Failed to delete: ' + err.message);
    }
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, { status: newStatus });
      
      // Update selected order modal status
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      
      triggerAlert('success', `Order status updated to "${newStatus}"`);
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerAlert('error', 'Failed to update order: ' + err.message);
    }
  };

  // Create Coupon
  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    const payload: Coupon = {
      code: couponCode.trim().toUpperCase(),
      discountType: couponType,
      value: Number(couponValue),
      minPurchase: Number(couponMinPurchase),
      isActive: true,
      description: couponDesc || `Flat ${couponType === 'fixed' ? '₹' : ''}${couponValue}${couponType === 'percentage' ? '%' : ''} off on orders over ₹${couponMinPurchase}`
    };

    try {
      const docRef = doc(db, 'coupons', payload.code);
      await updateDoc(docRef, { ...payload }); // updates or creates
      triggerAlert('success', `Coupon "${payload.code}" added/updated successfully!`);
      setCouponCode('');
      setCouponValue(10);
      setCouponMinPurchase(1000);
      setCouponDesc('');
      onRefreshData();
    } catch (err: any) {
      // Doc might not exist, so try setting it using standard add or set doc
      try {
        const batch = doc(db, 'coupons', payload.code);
        // Fallback or import writeDoc
        triggerAlert('error', 'Coupon creation failed: ' + err.message);
      } catch (inner) {
        console.error(inner);
      }
    }
  };

  // Toggle coupon status
  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      const docRef = doc(db, 'coupons', coupon.code);
      await updateDoc(docRef, { isActive: !coupon.isActive });
      triggerAlert('success', `Coupon ${coupon.code} status updated.`);
      onRefreshData();
    } catch (err: any) {
      console.error(err);
    }
  };

  // KPI Calculations
  const totalSales = allOrders
    .filter(o => o.status !== 'Cancelled' && o.status !== 'Payment Verification Pending')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const pendingVerificationOrders = allOrders.filter(o => o.status === 'Payment Verification Pending');
  const activeOrders = allOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const completedOrdersCount = allOrders.filter(o => o.status === 'Delivered').length;
  
  // Low Stock Items list
  const lowStockProducts = allProducts.filter(p => p.stock <= 5);

  // Search filtered products or orders
  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="admin-dashboard" className="bg-neutral-50 min-h-screen text-neutral-900 font-sans">
      
      {/* Alert toast notifications */}
      {alertMsg.text && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl border-l-4 flex items-center gap-3 transition-all animate-bounce ${
          alertMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-500 text-emerald-800' 
            : 'bg-red-50 border-red-500 text-red-800'
        }`}>
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider">{alertMsg.text}</span>
        </div>
      )}

      {/* Admin header rail */}
      <div className="bg-neutral-950 text-white py-8 px-6 md:px-12 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-orange-500 text-xs font-black uppercase tracking-widest block mb-1">
              Store Owner Control Centre
            </span>
            <h1 className="text-3xl font-black tracking-tight uppercase">
              Rightnow <span className="text-orange-500">Garments</span> Dashboard
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Manage inventory, verify UPI proof screenshots, and fulfill fashion orders.
            </p>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => { onRefreshData(); triggerAlert('success', 'Database updated with latest cloud records!'); }}
              className="bg-neutral-900 hover:bg-neutral-800 p-3 rounded-xl border border-neutral-800 flex items-center gap-1.5 text-xs font-bold transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Sync
            </button>
            <div className="bg-orange-500 text-white font-black text-xs uppercase px-4 py-3 rounded-xl shadow-md">
              Level: Administrator
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tab Switching Navigation */}
      <div className="border-b border-neutral-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 flex overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-4 px-6 font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'analytics' 
                ? 'border-orange-500 text-orange-600' 
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <BarChart className="w-4 h-4" />
            Sales & Analytics
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`py-4 px-6 font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'products' 
                ? 'border-orange-500 text-orange-600' 
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Manage Products ({allProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-6 font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'orders' 
                ? 'border-orange-500 text-orange-600' 
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Verify orders ({allOrders.length})
            {pendingVerificationOrders.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                {pendingVerificationOrders.length} Pending
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`py-4 px-6 font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'coupons' 
                ? 'border-orange-500 text-orange-600' 
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Percent className="w-4 h-4" />
            Coupons System
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* TAB 1: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Bento statistics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Gross Sales (Paid)</span>
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-neutral-950">₹{totalSales.toLocaleString('en-IN')}</h3>
                  <p className="text-[10px] text-neutral-400 mt-1">Excludes pending or cancelled orders</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Active Orders</span>
                  <div className="p-2.5 bg-orange-50 text-orange-500 rounded-xl">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-neutral-950">{activeOrders.length} Orders</h3>
                  <p className="text-[10px] text-neutral-400 mt-1">Currently in processing pipeline</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Dispatched Delivery</span>
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-neutral-950">{completedOrdersCount} Delivered</h3>
                  <p className="text-[10px] text-neutral-400 mt-1">Delivered to customers safely</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Low Stock Alerts</span>
                  <div className={`p-2.5 rounded-xl ${lowStockProducts.length > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-neutral-50 text-neutral-400'}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-neutral-950">{lowStockProducts.length} Items</h3>
                  <p className="text-[10px] text-neutral-400 mt-1">Products with under 5 stock remaining</p>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sales Interactive Trend Plot */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-base font-black text-neutral-950 uppercase tracking-tight">Sales Outlets Revenue</h3>
                  <p className="text-xs text-neutral-400">Total transaction breakdown in Rightnow store by category</p>
                </div>

                {/* Hand crafted luxury SVG Chart */}
                <div className="relative h-64 w-full flex items-end justify-between pt-6 px-4 border-b border-neutral-100 bg-neutral-50 rounded-xl">
                  {/* Grid Lines */}
                  <div className="absolute inset-x-0 top-1/4 border-b border-neutral-200/40"></div>
                  <div className="absolute inset-x-0 top-2/4 border-b border-neutral-200/40"></div>
                  <div className="absolute inset-x-0 top-3/4 border-b border-neutral-200/40"></div>

                  {['Shirts', 'T-Shirts', 'Jeans', 'Trousers', 'Jackets', 'Accessories'].map((cat, idx) => {
                    const catTotal = allOrders
                      .filter(o => o.status !== 'Cancelled')
                      .flatMap(o => o.items)
                      .filter(item => {
                        const prod = allProducts.find(p => p.id === item.productId);
                        return prod ? prod.category === cat : false;
                      })
                      .reduce((sum, item) => sum + (item.price * item.quantity), 0);

                    // Find max or set scale factor
                    const percentHeight = Math.min(100, Math.max(8, (catTotal / 25000) * 100));

                    return (
                      <div key={cat} className="flex flex-col items-center gap-2 z-10 w-12 group">
                        {/* Tooltip value */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute mb-20 bg-neutral-900 text-white text-[10px] font-black py-1 px-2.5 rounded shadow-xl -translate-y-4">
                          ₹{catTotal.toLocaleString('en-IN')}
                        </div>
                        {/* Interactive Bar */}
                        <div 
                          style={{ height: `${percentHeight}%` }}
                          className="w-8 bg-gradient-to-t from-orange-600 to-orange-400 hover:from-neutral-900 hover:to-neutral-950 rounded-t-md transition-all duration-500 shadow-md flex items-end justify-center"
                        ></div>
                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tight truncate w-full text-center">
                          {cat}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Low Stock Alerts & Fast Replenish Panel */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4 flex flex-col">
                <div>
                  <h3 className="text-base font-black text-neutral-950 uppercase tracking-tight flex items-center gap-1.5">
                    <AlertTriangle className="text-red-500 w-4 h-4" />
                    Low Stock Alerts
                  </h3>
                  <p className="text-xs text-neutral-400">Immediate garment restocking list</p>
                </div>

                <div className="flex-grow overflow-y-auto space-y-3 max-h-64 pr-1 scrollbar-none">
                  {lowStockProducts.length === 0 ? (
                    <div className="text-center py-12 text-neutral-400 text-xs font-semibold">
                      ✓ All products have healthy stock levels.
                    </div>
                  ) : (
                    lowStockProducts.map((p) => (
                      <div key={p.id} className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={p.images[0]} className="w-10 h-12 object-cover rounded" />
                          <div className="text-left">
                            <span className="font-bold text-xs text-neutral-900 line-clamp-1">{p.name}</span>
                            <span className="text-[10px] text-neutral-400 uppercase font-bold">{p.category} • Size {p.sizes.join(', ')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-red-600 block">{p.stock} units left</span>
                          <button
                            onClick={() => handleStartEdit(p)}
                            className="text-[10px] text-orange-500 font-extrabold hover:underline"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: PRODUCT MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header filters and creator button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-neutral-100 shadow-3xs">
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search products by title, category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-950"
                />
              </div>

              <button
                onClick={() => {
                  resetProductForm();
                  setIsEditingProduct(true);
                  // scroll to form
                  document.getElementById('product-form-anchor')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-neutral-950 hover:bg-neutral-800 text-white px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add New Garment Product
              </button>
            </div>

            {/* Editing Form Panel Anchor */}
            {isEditingProduct && (
              <div 
                id="product-form-anchor" 
                className="bg-white p-6 md:p-8 rounded-2xl border border-neutral-200 shadow-xl space-y-6"
              >
                <div>
                  <h3 className="text-base font-black text-neutral-950 uppercase tracking-tight">
                    {productFormId ? 'Edit Product Parameters' : 'Create Brand New Product'}
                  </h3>
                  <p className="text-xs text-neutral-400">Define premium specifications and upload high-resolution Unsplash assets.</p>
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Product Title / Name *</label>
                      <input
                        type="text"
                        required
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g. Classic Mandarin Collar Cotton Shirt"
                        className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Brand Name</label>
                      <input
                        type="text"
                        required
                        value={productBrand}
                        onChange={(e) => setProductBrand(e.target.value)}
                        className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Stock Availability Quantity *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={productStock}
                        onChange={(e) => setProductStock(Number(e.target.value))}
                        className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Main Category</label>
                      <select
                        value={productCategory}
                        onChange={(e) => setProductCategory(e.target.value)}
                        className="w-full p-2.5 border border-neutral-200 bg-white rounded-lg text-xs font-bold"
                      >
                        <option value="Shirts">Shirts</option>
                        <option value="T-Shirts">T-Shirts</option>
                        <option value="Jeans">Jeans</option>
                        <option value="Trousers">Trousers</option>
                        <option value="Jackets">Jackets</option>
                        <option value="Accessories">Accessories</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Subcategory / Filter Group</label>
                      <input
                        type="text"
                        required
                        value={productSubCategory}
                        onChange={(e) => setProductSubCategory(e.target.value)}
                        placeholder="e.g. Printed Shirts"
                        className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Original Retail Price (₹) *</label>
                      <input
                        type="number"
                        required
                        value={productPrice}
                        onChange={(e) => setProductPrice(Number(e.target.value))}
                        className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Special Offer Price (₹) *</label>
                      <input
                        type="number"
                        required
                        value={productOfferPrice}
                        onChange={(e) => setProductOfferPrice(Number(e.target.value))}
                        className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                      />
                    </div>

                  </div>

                  {/* Images & Details */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase text-neutral-400">Unsplash High-Res Image URLs (up to 3, comma separated) *</label>
                    <textarea
                      required
                      value={productImages.join(', ')}
                      onChange={(e) => setProductImages(e.target.value.split(',').map(s => s.trim()))}
                      placeholder="https://images.unsplash.com/..., https://..."
                      rows={2}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  {/* Specifications Section */}
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-4">
                    <span className="text-[10px] font-black uppercase text-neutral-400 block">Garment Tech Specifications</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      <div>
                        <label className="block text-[9px] font-black text-neutral-500 mb-1">Fabric Material</label>
                        <input type="text" value={specMaterial} onChange={e => setSpecMaterial(e.target.value)} className="w-full p-2 border border-neutral-200 rounded bg-white text-xs"/>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-neutral-500 mb-1">Garment Fit</label>
                        <input type="text" value={specFit} onChange={e => setSpecFit(e.target.value)} className="w-full p-2 border border-neutral-200 rounded bg-white text-xs"/>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-neutral-500 mb-1">Sleeve Type</label>
                        <input type="text" value={specSleeve} onChange={e => setSpecSleeve(e.target.value)} className="w-full p-2 border border-neutral-200 rounded bg-white text-xs"/>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-neutral-500 mb-1">Neckline</label>
                        <input type="text" value={specNeckline} onChange={e => setSpecNeckline(e.target.value)} className="w-full p-2 border border-neutral-200 rounded bg-white text-xs"/>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-neutral-500 mb-1">Fabric Style</label>
                        <input type="text" value={specFabric} onChange={e => setSpecFabric(e.target.value)} className="w-full p-2 border border-neutral-200 rounded bg-white text-xs"/>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-neutral-500 mb-1">Occasion</label>
                        <input type="text" value={specOccasion} onChange={e => setSpecOccasion(e.target.value)} className="w-full p-2 border border-neutral-200 rounded bg-white text-xs"/>
                      </div>
                    </div>
                  </div>

                  {/* Size & Color Tags arrays */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Available Sizes (Comma Separated)</label>
                      <input
                        type="text"
                        value={productSizes.join(', ')}
                        onChange={(e) => setProductSizes(e.target.value.split(',').map(s => s.trim().toUpperCase()))}
                        className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Color Palette (Comma Separated)</label>
                      <input
                        type="text"
                        value={productColors.join(', ')}
                        onChange={(e) => setProductColors(e.target.value.split(',').map(s => s.trim()))}
                        className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Description Box */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Full Aesthetic Description</label>
                    <textarea
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      placeholder="Describe the fabric feel, continuous buttons details, stitching structure, and why customers love this product..."
                      rows={3}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                    />
                  </div>

                  {/* Flags badging */}
                  <div className="flex gap-6 pt-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                      <input type="checkbox" checked={flagTrending} onChange={e => setFlagTrending(e.target.checked)} className="w-4 h-4 rounded text-orange-500 border-neutral-300 focus:ring-orange-500"/>
                      Trending Collection
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                      <input type="checkbox" checked={flagBestSeller} onChange={e => setFlagBestSeller(e.target.checked)} className="w-4 h-4 rounded text-orange-500 border-neutral-300 focus:ring-orange-500"/>
                      Best Seller Outfits
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                      <input type="checkbox" checked={flagNewArrival} onChange={e => setFlagNewArrival(e.target.checked)} className="w-4 h-4 rounded text-orange-500 border-neutral-300 focus:ring-orange-500"/>
                      New Arrivals Highlight
                    </label>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={resetProductForm}
                      className="px-5 py-2.5 border border-neutral-200 rounded-lg text-xs font-black uppercase tracking-wider text-neutral-600 hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all"
                    >
                      {submitting ? 'Saving to Database...' : 'Save Fashion Product'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List products catalog in a gorgeous table/grid layout */}
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-950 text-white text-[10px] font-black uppercase tracking-widest border-b border-neutral-100">
                      <th className="p-4 pl-6">Garment Item</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Price (Offer)</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4">Collections</th>
                      <th className="p-4 text-right pr-6">Catalog Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-xs text-neutral-700">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 pl-6 flex items-center gap-3.5">
                          <img src={p.images[0]} className="w-10 h-13 object-cover rounded-lg bg-neutral-100 border border-neutral-200" />
                          <div>
                            <span className="font-extrabold text-neutral-900 block">{p.name}</span>
                            <span className="text-[10px] text-neutral-400 block uppercase font-bold">{p.brand}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="bg-neutral-100 px-2.5 py-1 rounded-full font-bold text-[10px]">
                            {p.category}
                          </span>
                        </td>
                        <td className="p-4 font-bold">
                          <span className="text-neutral-900">₹{p.offerPrice}</span>
                          {p.price > p.offerPrice && (
                            <span className="text-[10px] text-neutral-400 line-through block font-medium">₹{p.price}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`font-black text-xs ${p.stock <= 5 ? 'text-red-600' : 'text-neutral-900'}`}>
                            {p.stock} units
                          </span>
                        </td>
                        <td className="p-4 space-y-1">
                          {p.isTrending && <span className="inline-block bg-orange-100 text-orange-800 text-[8px] font-black px-1.5 py-0.5 rounded mr-1 uppercase">Trending</span>}
                          {p.isBestSeller && <span className="inline-block bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded mr-1 uppercase">Bestseller</span>}
                          {p.isNewArrival && <span className="inline-block bg-blue-100 text-blue-800 text-[8px] font-black px-1.5 py-0.5 rounded mr-1 uppercase">New</span>}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex justify-end gap-2.5">
                            <button
                              onClick={() => {
                                handleStartEdit(p);
                                document.getElementById('product-form-anchor')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="p-2 text-neutral-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Edit product parameters"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete from catalogue"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VERIFY ORDERS (screenshot uploader validation & fulfilling) */}
        {activeTab === 'orders' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-base font-black text-neutral-950 uppercase tracking-tight">
                Order Verification & Screenshot Fulfillments
              </h3>
              <p className="text-xs text-neutral-400">Scan payment screenshots, confirm cash transactions, and dispatch order statuses.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Order list panel (1 col) */}
              <div className="lg:col-span-1 space-y-4">
                <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block">Customer Purchases</span>
                
                <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
                  {allOrders.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-neutral-100 text-neutral-400 text-xs font-semibold">
                      No orders placed in this store yet.
                    </div>
                  ) : (
                    allOrders.map((o) => {
                      const isPending = o.status === 'Payment Verification Pending';
                      return (
                        <div
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className={`p-4 bg-white rounded-xl border transition-all cursor-pointer text-left relative ${
                            selectedOrder?.id === o.id
                              ? 'border-orange-500 ring-2 ring-orange-100 shadow-md'
                              : 'border-neutral-100 hover:border-neutral-300 shadow-2xs'
                          }`}
                        >
                          {isPending && (
                            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                          )}
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-black text-xs text-neutral-900">{o.orderNumber}</span>
                            <span className="text-[9px] text-neutral-400 font-bold">{new Date(o.createdAt).toLocaleDateString()}</span>
                          </div>
                          
                          <p className="font-bold text-xs text-neutral-800 line-clamp-1 mb-1">{o.customerName}</p>
                          <p className="text-xs font-black text-neutral-950 mb-3">₹{o.totalAmount.toLocaleString('en-IN')}</p>

                          {/* Status pill */}
                          <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                            o.status === 'Payment Verification Pending' ? 'bg-red-50 text-red-600 border border-red-100' :
                            o.status === 'Confirmed' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            o.status === 'Packed' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                            o.status === 'Shipped' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                            o.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            'bg-neutral-100 text-neutral-500'
                          }`}>
                            {o.status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Order detailed preview panel (2 cols) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-100 p-6 space-y-6">
                {selectedOrder ? (
                  <div id="admin-order-details" className="space-y-6 text-left">
                    {/* Header Info */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-100 pb-4 gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-orange-500 block mb-0.5">Fulfillment Pipeline</span>
                        <h2 className="text-lg font-black text-neutral-950">{selectedOrder.orderNumber}</h2>
                        <p className="text-xs text-neutral-400">Placed on {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                      </div>

                      {/* Status quick select */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black uppercase text-neutral-400">Set Order Status</label>
                        <select
                          value={selectedOrder.status}
                          onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value as Order['status'])}
                          className="p-2 border border-neutral-200 bg-white rounded-lg text-xs font-black text-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="Payment Verification Pending">Payment Verification Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Packed">Packed</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {/* Split details layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      
                      {/* Products and addresses */}
                      <div className="space-y-4">
                        {/* Address */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase text-neutral-400 block">Deliver Address Details</span>
                          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-xs text-neutral-700 space-y-1">
                            <p className="font-extrabold text-neutral-950">{selectedOrder.shippingAddress.fullName}</p>
                            <p className="font-bold text-neutral-800">Phone: {selectedOrder.shippingAddress.mobileNumber}</p>
                            <p>Email: {selectedOrder.shippingAddress.email}</p>
                            <p className="pt-2 leading-relaxed">{selectedOrder.shippingAddress.address}</p>
                            <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.pinCode}</p>
                            {selectedOrder.shippingAddress.notes && (
                              <p className="text-neutral-500 italic pt-1.5 border-t border-neutral-200/50 mt-1.5">"Notes: {selectedOrder.shippingAddress.notes}"</p>
                            )}
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase text-neutral-400 block">Ordered Garments</span>
                          <div className="space-y-2 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                            {selectedOrder.items.map((item, idx) => (
                              <div key={idx} className="flex gap-3 text-xs border-b border-neutral-200/40 pb-2 last:border-b-0 last:pb-0">
                                <img src={item.image} className="w-10 h-13 object-cover rounded" />
                                <div>
                                  <span className="font-bold text-neutral-900 block">{item.productName}</span>
                                  <span className="text-[10px] text-neutral-500 block">Qty: {item.quantity} • Size: {item.selectedSize} • Color: {item.selectedColor}</span>
                                  <span className="font-black text-neutral-800 mt-1 block">₹{item.price} each</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Calculation box */}
                        <div className="flex justify-between bg-neutral-950 text-white p-3.5 rounded-xl text-xs font-bold uppercase tracking-tight">
                          <span>Total Cash Transfer</span>
                          <span className="text-orange-500 font-black">₹{selectedOrder.totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* PAYMENT PROOF SCREENSHOT VIEW */}
                      <div className="space-y-3">
                        <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider block">Customer's UPI Payment Screenshot</span>
                        
                        {selectedOrder.paymentScreenshot ? (
                          <div className="border-2 border-dashed border-neutral-200 rounded-2xl overflow-hidden p-2 bg-neutral-50 shadow-inner max-h-[360px] flex justify-center">
                            <img
                              src={selectedOrder.paymentScreenshot}
                              alt="Customer's UPI receipt proof"
                              className="object-contain max-h-[340px] rounded-lg cursor-pointer hover:scale-[1.02] transition-transform"
                              onClick={() => window.open(selectedOrder.paymentScreenshot, '_blank')}
                            />
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-red-200 bg-red-50/50 p-12 text-center rounded-2xl text-xs text-red-600 font-bold">
                            Warning: No payment screenshot proof uploaded for this order!
                          </div>
                        )}
                        <p className="text-[10px] text-neutral-400 text-center uppercase tracking-wider font-extrabold">
                          Click image to expand screenshot in new window
                        </p>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="text-center py-24 text-neutral-400 space-y-3">
                    <Inbox className="w-12 h-12 text-neutral-300 mx-auto" />
                    <div>
                      <p className="font-extrabold text-neutral-700 text-xs uppercase tracking-wider">No Order Selected</p>
                      <p className="text-[11px] text-neutral-400">Click on any customer order on the left panel to scan payment screenshots and fulfill the order.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: COUPONS SYSTEM */}
        {activeTab === 'coupons' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-base font-black text-neutral-950 uppercase tracking-tight">
                Discount Coupon Management
              </h3>
              <p className="text-xs text-neutral-400">Generate, activate, or toggle discount promotional codes for Rightnow clients.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Creator Form (1 col) */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4 text-left">
                <span className="text-[10px] font-black uppercase text-neutral-400 block tracking-widest">Create New Promotion</span>
                
                <form onSubmit={handleAddCoupon} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Coupon Code *</label>
                    <input
                      type="text"
                      required
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="e.g. MONSOON300"
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs uppercase font-mono font-black focus:ring-2 focus:ring-neutral-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Type</label>
                      <select
                        value={couponType}
                        onChange={(e) => setCouponType(e.target.value as 'percentage' | 'fixed')}
                        className="w-full p-2 border border-neutral-200 bg-white rounded-lg text-xs font-bold"
                      >
                        <option value="percentage">% Percentage</option>
                        <option value="fixed">Flat ₹ Amount</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Discount Value *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={couponValue}
                        onChange={(e) => setCouponValue(Number(e.target.value))}
                        className="w-full p-2 border border-neutral-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Minimum Purchase (₹) *</label>
                    <input
                      type="number"
                      required
                      value={couponMinPurchase}
                      onChange={(e) => setCouponMinPurchase(Number(e.target.value))}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Brief Description</label>
                    <textarea
                      value={couponDesc}
                      onChange={(e) => setCouponDesc(e.target.value)}
                      placeholder="e.g. Save ₹300 off on ordering over ₹2000!"
                      rows={2}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-neutral-950 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-colors"
                  >
                    Save Promotion Code
                  </button>
                </form>
              </div>

              {/* List grid (2 cols) */}
              <div className="md:col-span-2 space-y-4 text-left">
                <span className="text-[10px] font-black uppercase text-neutral-400 block tracking-widest">Active Store Coupon List</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allCoupons.map((coupon) => (
                    <div 
                      key={coupon.code}
                      className={`p-4 rounded-xl border bg-white shadow-2xs space-y-3 relative flex flex-col justify-between ${
                        coupon.isActive ? 'border-orange-200/80 bg-orange-50/10' : 'border-neutral-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="bg-neutral-950 text-white font-mono font-black text-xs tracking-wider uppercase px-2.5 py-1 rounded">
                          {coupon.code}
                        </span>
                        
                        <button
                          onClick={() => handleToggleCoupon(coupon)}
                          className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                            coupon.isActive 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}
                        >
                          {coupon.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </div>

                      <p className="text-xs text-neutral-600 leading-snug">{coupon.description}</p>
                      
                      <div className="border-t border-neutral-100 pt-2 flex justify-between text-[10px] text-neutral-400 font-extrabold uppercase">
                        <span>Min Buy: ₹{coupon.minPurchase}</span>
                        <span>Value: {coupon.discountType === 'fixed' ? '₹' : ''}{coupon.value}{coupon.discountType === 'percentage' ? '%' : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
