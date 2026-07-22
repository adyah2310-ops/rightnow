import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Order, Coupon, Employee, POSSale } from '../types';
import { 
  BarChart, Layers, Inbox, Percent, AlertTriangle, Plus, Edit2, Trash2, 
  Check, X, Eye, FileText, TrendingUp, ShoppingCart, Users, CheckCircle, 
  Truck, PackageCheck, AlertCircle, ShoppingBag, XCircle, Search, RefreshCw, Settings,
  Lock, Key, LogOut, Clock, ShieldCheck, Receipt, Landmark, Boxes, ArrowLeftRight, HelpCircle,
  Globe, Store, CreditCard, Smartphone, Banknote, PieChart, Award, Sparkles
} from 'lucide-react';

// Import newly integrated POS & GST billing modules
import POSBilling from './pos/POSBilling';
import PurchasesManager from './pos/PurchasesManager';
import InventoryManager from './pos/InventoryManager';
import CustomersLoyalty from './pos/CustomersLoyalty';
import POSReports from './pos/POSReports';
import SettingsManager from './pos/SettingsManager';

interface AdminPanelProps {
  user?: { email: string | null; name: string } | null;
  allProducts: Product[];
  allOrders: Order[];
  allCoupons: Coupon[];
  onRefreshData: () => void;
  categories: string[];
  deliverySettings: {
    expressEnabled: boolean;
    expressCharge: number;
    normalCharge: number;
    freeDeliveryThreshold: number;
    eligibleLocations: string[];
  };
}

export default function AdminPanel({
  user,
  allProducts,
  allOrders,
  allCoupons,
  onRefreshData,
  categories,
  deliverySettings
}: AdminPanelProps) {
  // Always use logged-in Gmail user as Owner Admin
  const currentEmployee: Employee = {
    id: 'owner_admin',
    name: user?.name || user?.email?.split('@')[0] || 'Store Owner',
    email: user?.email || 'owner@rightnowgarments.com',
    phone: '+91 94432 10982',
    role: 'Admin',
    pinCode: '1234',
    status: 'Active',
    createdDate: new Date().toISOString()
  };
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);

  // Navigation tabs - Extended for combined E-Commerce & Retail POS
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'products' | 'orders' | 'coupons' | 'categories' | 'logistics' |
    'pos-billing' | 'pos-inventory' | 'pos-suppliers' | 'pos-purchases' | 'pos-customers' | 'pos-employees' | 'pos-reports' | 'pos-settings'
  >('analytics');

  // Business Profile for POS Billings and GST receipts
  const [businessProfile, setBusinessProfile] = useState({
    storeName: 'Rightnow Garments',
    storeAddress: '12, Factory Street, Tiruchirappalli, Tamil Nadu, 620001',
    storePhone: '+91 94432 10982',
    storeEmail: 'billing@rightnowgarments.com',
    storeGstin: '33AAAAA1111A1Z1',
    upiQrUrl: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?q=80&w=300&auto=format&fit=crop'
  });

  const fetchBusinessProfile = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'business_profile'));
      if (snap.exists()) {
        const d = snap.data();
        setBusinessProfile({
          storeName: d.storeName || 'Rightnow Garments',
          storeAddress: d.storeAddress || '12, Factory Street, Tiruchirappalli, Tamil Nadu, 620001',
          storePhone: d.storePhone || '+91 94432 10982',
          storeEmail: d.storeEmail || 'billing@rightnowgarments.com',
          storeGstin: d.storeGstin || '33AAAAA1111A1Z1',
          upiQrUrl: d.upiQrUrl || 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?q=80&w=300&auto=format&fit=crop'
        });
      }
    } catch (e) {
      console.error('Error loading business profile settings:', e);
    }
  };

  useEffect(() => {
    fetchBusinessProfile();
  }, [activeTab]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Selected order details modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Add/Edit product states
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productFormId, setProductFormId] = useState('');
  const [productSku, setProductSku] = useState('');
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
  const [productGstPercent, setProductGstPercent] = useState<number>(5);
  
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

  // Category management form states
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Delivery / Logistics form states
  const [logisticsExpressEnabled, setLogisticsExpressEnabled] = useState(false);
  const [logisticsExpressCharge, setLogisticsExpressCharge] = useState(0);
  const [logisticsNormalCharge, setLogisticsNormalCharge] = useState(0);
  const [logisticsFreeThreshold, setLogisticsFreeThreshold] = useState(0);
  const [logisticsLocationsInput, setLogisticsLocationsInput] = useState('');

  // Sync settings when props change
  useEffect(() => {
    if (deliverySettings) {
      setLogisticsExpressEnabled(deliverySettings.expressEnabled ?? false);
      setLogisticsExpressCharge(deliverySettings.expressCharge ?? 0);
      setLogisticsNormalCharge(deliverySettings.normalCharge ?? 0);
      setLogisticsFreeThreshold(deliverySettings.freeDeliveryThreshold ?? 0);
      setLogisticsLocationsInput((deliverySettings.eligibleLocations ?? []).join(', '));
    }
  }, [deliverySettings]);

  // Analytics Channel view filter state
  const [analyticsChannel, setAnalyticsChannel] = useState<'COMBINED' | 'DIGITAL_ECOM' | 'RETAIL_POS'>('COMBINED');
  const [posSalesList, setPosSalesList] = useState<POSSale[]>([]);

  // Fetch employees list from Firestore
  const fetchEmployeesList = async () => {
    try {
      const snap = await getDocs(collection(db, 'employees'));
      const list: Employee[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployeesList(list);
    } catch (e) {
      console.error("Error fetching employees database:", e);
    }
  };

  // Fetch offline POS sales list from Firestore for separate POS analytics
  const fetchPosSales = async () => {
    try {
      const snap = await getDocs(collection(db, 'pos_sales'));
      const list: POSSale[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as POSSale);
      });
      setPosSalesList(list);
    } catch (e) {
      console.error("Error fetching POS sales database:", e);
    }
  };

  useEffect(() => {
    fetchEmployeesList();
    fetchPosSales();
  }, [activeTab]);

  // Alert message helper
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

  // Generate unique SKU code
  const generateUniqueSku = (cat?: string, name?: string) => {
    const prefix = 'RNG';
    const catPart = (cat || productCategory || 'GAR').substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${catPart}-${randomNum}`;
  };

  // Reset product form
  const resetProductForm = () => {
    setIsEditingProduct(false);
    setProductFormId('');
    setProductSku('');
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
    setProductGstPercent(5);
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

  // Quick update price & GST rate directly from products table
  const handleQuickUpdateGstAndPrice = async (p: Product, newPrice: number, newOfferPrice: number, newGst: number) => {
    try {
      const docRef = doc(db, 'products', p.id);
      await updateDoc(docRef, {
        price: Number(newPrice),
        offerPrice: Number(newOfferPrice),
        gstPercent: Number(newGst),
        updatedDate: new Date().toISOString()
      });
      triggerAlert('success', `Updated GST (${newGst}%) & Prices for "${p.name}"`);
      onRefreshData();
    } catch (err) {
      console.error(err);
      triggerAlert('error', `Failed to update GST/Price for "${p.name}"`);
    }
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

    // Process & Validate SKU ID
    const finalSku = productSku.trim() 
      ? productSku.trim().toUpperCase() 
      : generateUniqueSku(productCategory, productName);

    // Check SKU Uniqueness
    const duplicateSkuProduct = allProducts.find(
      p => p.sku && p.sku.trim().toUpperCase() === finalSku && p.id !== productFormId
    );
    if (duplicateSkuProduct) {
      triggerAlert('error', `SKU ID "${finalSku}" is already assigned to "${duplicateSkuProduct.name}". Please enter or auto-generate a unique SKU.`);
      setSubmitting(false);
      return;
    }

    const payload: Omit<Product, 'id'> = {
      name: productName,
      sku: finalSku,
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
      isNewArrival: flagNewArrival,
      gstPercent: Number(productGstPercent)
    };

    try {
      if (productFormId) {
        // Edit existing product
        const docRef = doc(db, 'products', productFormId);
        await updateDoc(docRef, payload);
        triggerAlert('success', `Product "${productName}" (SKU: ${finalSku}) updated successfully!`);
      } else {
        // Add new product
        const id = `prod_${Date.now()}`;
        await addDoc(collection(db, 'products'), { ...payload, id });
        triggerAlert('success', `Product "${productName}" (SKU: ${finalSku}) created successfully!`);
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
    setProductSku(product.sku || generateUniqueSku(product.category, product.name));
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
    setProductGstPercent(product.gstPercent || 5);
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

  // Category CRUD operations
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) return;
    setSubmitting(true);
    try {
      const catId = editingCategoryId || categoryNameInput.trim().toLowerCase();
      await setDoc(doc(db, 'categories', catId), {
        name: categoryNameInput.trim(),
        createdAt: new Date().toISOString()
      });
      triggerAlert('success', `Category "${categoryNameInput}" saved successfully!`);
      setCategoryNameInput('');
      setEditingCategoryId(null);
      onRefreshData();
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${catName}"? All products in this category will remain, but the category navigation will change.`)) return;
    setSubmitting(true);
    try {
      const catId = catName.toLowerCase();
      await deleteDoc(doc(db, 'categories', catId));
      triggerAlert('success', `Category "${catName}" deleted successfully!`);
      onRefreshData();
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to delete category');
    } finally {
      setSubmitting(false);
    }
  };

  // Logistics & Delivery settings operations
  const handleSaveLogistics = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const locations = logisticsLocationsInput
        .split(',')
        .map(loc => loc.trim())
        .filter(loc => loc !== '');

      await setDoc(doc(db, 'settings', 'delivery'), {
        expressEnabled: logisticsExpressEnabled,
        expressCharge: Number(logisticsExpressCharge),
        normalCharge: Number(logisticsNormalCharge),
        freeDeliveryThreshold: Number(logisticsFreeThreshold),
        eligibleLocations: locations
      });

      triggerAlert('success', 'Logistics & delivery configurations updated successfully!');
      onRefreshData();
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to update logistics configurations');
    } finally {
      setSubmitting(false);
    }
  };

  // Detailed Separate Channel Calculations
  // 1. Digital E-Commerce Web Orders
  const validOnlineOrders = allOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Payment Verification Pending');
  const ecomRevenue = validOnlineOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const ecomCount = validOnlineOrders.length;
  const ecomAov = ecomCount > 0 ? ecomRevenue / ecomCount : 0;
  const pendingVerificationOrders = allOrders.filter(o => o.status === 'Payment Verification Pending');
  const activeOrders = allOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const completedOrdersCount = allOrders.filter(o => o.status === 'Delivered').length;
  const ecomDeliveryCharges = validOnlineOrders.reduce((acc, o) => acc + (o.deliveryCharge || 0), 0);
  const ecomGstTotal = validOnlineOrders.flatMap(o => o.items).reduce((sum, item) => {
    const gstPct = item.gstPercent || 5;
    const basePrice = item.price;
    const taxable = basePrice / (1 + (gstPct / 100));
    return sum + ((basePrice - taxable) * item.quantity);
  }, 0);

  // 2. Retail Outlet POS In-Store Transactions
  const validPosSales = posSalesList.filter(s => s.status !== 'Cancelled');
  const posRevenue = validPosSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const posCount = validPosSales.length;
  const posAtv = posCount > 0 ? posRevenue / posCount : 0;
  const posGstTotal = validPosSales.reduce((acc, s) => acc + s.taxTotal, 0);

  const posCashTotal = validPosSales.filter(s => s.paymentMode === 'Cash').reduce((a, s) => a + s.grandTotal, 0);
  const posCashCount = validPosSales.filter(s => s.paymentMode === 'Cash').length;
  const posUpiTotal = validPosSales.filter(s => s.paymentMode === 'UPI').reduce((a, s) => a + s.grandTotal, 0);
  const posUpiCount = validPosSales.filter(s => s.paymentMode === 'UPI').length;
  const posCardTotal = validPosSales.filter(s => s.paymentMode === 'Card').reduce((a, s) => a + s.grandTotal, 0);
  const posCardCount = validPosSales.filter(s => s.paymentMode === 'Card').length;
  const posSplitTotal = validPosSales.filter(s => s.paymentMode === 'Split').reduce((a, s) => a + s.grandTotal, 0);
  const posSplitCount = validPosSales.filter(s => s.paymentMode === 'Split').length;

  // Cashier Leaderboard for Retail Outlet
  const cashierMap: Record<string, { name: string; total: number; count: number }> = validPosSales.reduce(
    (acc: Record<string, { name: string; total: number; count: number }>, s) => {
      const name = s.cashierName || 'Cashier';
      if (!acc[name]) acc[name] = { name, total: 0, count: 0 };
      acc[name].total += s.grandTotal;
      acc[name].count += 1;
      return acc;
    },
    {}
  );
  const cashierList = Object.values(cashierMap).sort((a, b) => b.total - a.total);

  // 3. Combined Omnichannel Metrics
  const combinedRevenue = ecomRevenue + posRevenue;
  const totalSales = combinedRevenue;
  const ecomSharePct = combinedRevenue > 0 ? Math.round((ecomRevenue / combinedRevenue) * 100) : 0;
  const posSharePct = combinedRevenue > 0 ? Math.round((posRevenue / combinedRevenue) * 100) : 0;
  
  // Low Stock Items list
  const lowStockProducts = allProducts.filter(p => p.stock <= 5);

  // Search filtered products or orders
  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="bg-neutral-950 text-white py-6 px-6 md:px-12 shrink-0 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-orange-500 text-xs font-black uppercase tracking-widest block mb-1">
              Store Operator Control Centre
            </span>
            <h1 className="text-2xl font-black tracking-tight uppercase">
              Rightnow <span className="text-orange-500">Garments</span> POS Hub
            </h1>
            <p className="text-[10px] text-neutral-400 mt-1 uppercase font-bold">
              Owner Admin: <span className="text-amber-400">{currentEmployee.name}</span> ({currentEmployee.email})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-400 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Google Auth Verified
            </span>
            <button 
              onClick={() => { onRefreshData(); triggerAlert('success', 'Database updated with latest cloud records!'); }}
              className="bg-neutral-900 hover:bg-neutral-800 p-3 rounded-xl border border-neutral-800 flex items-center gap-1.5 text-xs font-bold transition-all text-white cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync DB
            </button>
          </div>
        </div>
      </div>

      {/* Admin Tab Switching Navigation - Categorized by Channel and constrained by role */}
      <div className="border-b border-neutral-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-2 flex flex-col gap-2">
          
          {/* Categorized group 1: E-COMMERCE HUB (Only visible for Admins) */}
          {currentEmployee.role === 'Admin' && (
            <div className="flex items-center gap-3 border-b border-neutral-100 pb-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 shrink-0 select-none bg-neutral-100 px-2 py-0.5 rounded">Digital E-Com Platform</span>
              
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-1.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'analytics' 
                    ? 'bg-neutral-950 text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <BarChart className="w-3.5 h-3.5" />
                Sales & Analytics
              </button>
              
              <button
                onClick={() => setActiveTab('products')}
                className={`py-1.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'products' 
                    ? 'bg-neutral-950 text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Products Catalogue
              </button>
              
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-1.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'orders' 
                    ? 'bg-neutral-950 text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                Verify Web Orders ({allOrders.length})
                {pendingVerificationOrders.length > 0 && (
                  <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                    {pendingVerificationOrders.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('coupons')}
                className={`py-1.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'coupons' 
                    ? 'bg-neutral-950 text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                Promotional Coupons
              </button>
              
              <button
                onClick={() => setActiveTab('categories')}
                className={`py-1.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'categories' 
                    ? 'bg-neutral-950 text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Categories
              </button>
              
              <button
                onClick={() => setActiveTab('logistics')}
                className={`py-1.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'logistics' 
                    ? 'bg-neutral-950 text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                Logistics Setup
              </button>
            </div>
          )}

          {/* Categorized group 2: PHYSICAL SHOWROOM RETAIL POS (Enforce role-based tab access) */}
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 shrink-0 select-none bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100">Retail Outlet POS</span>
            
            {/* 1. POS Billing: Accessible to Admin, Manager, Cashier */}
            <button
              onClick={() => setActiveTab('pos-billing')}
              className={`py-1.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'pos-billing' 
                  ? 'bg-orange-500 text-white shadow-xs' 
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Cashier Billing screen
            </button>

            {/* 2. Central Inventory: Accessible to Admin, Manager */}
            {(currentEmployee.role === 'Admin' || currentEmployee.role === 'Manager') && (
              <button
                onClick={() => setActiveTab('pos-inventory')}
                className={`py-1.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'pos-inventory' 
                    ? 'bg-orange-500 text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                Central Stock ledger
              </button>
            )}

            {/* 3. Bulk stock purchases: Accessible to Admin, Manager */}
            {(currentEmployee.role === 'Admin' || currentEmployee.role === 'Manager') && (
              <button
                onClick={() => setActiveTab('pos-purchases')}
                className={`py-1.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'pos-purchases' 
                    ? 'bg-orange-500 text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Bulk purchases
              </button>
            )}

            {/* 5. Loyalty Customers Database: Accessible to Admin, Manager */}
            {(currentEmployee.role === 'Admin' || currentEmployee.role === 'Manager') && (
              <button
                onClick={() => setActiveTab('pos-customers')}
                className={`py-1.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'pos-customers' 
                    ? 'bg-orange-500 text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Loyalty & Wallet
              </button>
            )}

            {/* 7. Profit, P&L, GST taxation analytics: Accessible to Admin */}
            {currentEmployee.role === 'Admin' && (
              <button
                onClick={() => setActiveTab('pos-reports')}
                className={`py-1.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'pos-reports' 
                    ? 'bg-orange-500 text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                Profit & GST tax Reports
              </button>
            )}

            {/* 8. Corporate billing settings: Accessible to Admin */}
            {currentEmployee.role === 'Admin' && (
              <button
                onClick={() => setActiveTab('pos-settings')}
                className={`py-1.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'pos-settings' 
                    ? 'bg-orange-500 text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Showroom Setup
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* TAB 1: SEPARATE SALES & ANALYTICS FOR DIGITAL E-COM & RETAIL OUTLET POS */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Top Channel Selector Rail */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                    <BarChart className="w-4 h-4" />
                  </span>
                  <h2 className="text-sm font-black uppercase tracking-wider text-neutral-950">
                    Channel Analytics & Sales Control
                  </h2>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Filter analytics between Digital E-Commerce website orders and Brick-and-Mortar Retail POS checkout counters.
                </p>
              </div>

              {/* Segmented Channel Switcher Buttons */}
              <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setAnalyticsChannel('COMBINED')}
                  className={`px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    analyticsChannel === 'COMBINED' 
                      ? 'bg-neutral-950 text-white shadow-xs' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <BarChart className="w-3.5 h-3.5" />
                  Combined Omnichannel
                </button>

                <button
                  type="button"
                  onClick={() => setAnalyticsChannel('DIGITAL_ECOM')}
                  className={`px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    analyticsChannel === 'DIGITAL_ECOM' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Digital E-Com Website
                </button>

                <button
                  type="button"
                  onClick={() => setAnalyticsChannel('RETAIL_POS')}
                  className={`px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    analyticsChannel === 'RETAIL_POS' 
                      ? 'bg-orange-500 text-white shadow-xs' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  Retail Outlet POS
                </button>
              </div>
            </div>

            {/* CHANNEL VIEW 1: DIGITAL E-COMMERCE WEBSITE ONLY */}
            {analyticsChannel === 'DIGITAL_ECOM' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="bg-indigo-950 text-white p-4 rounded-2xl border border-indigo-800 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-left">
                    <Globe className="w-6 h-6 text-indigo-400" />
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider">Digital E-Commerce Channel Performance</h3>
                      <p className="text-[10px] text-indigo-200">Real-time online orders placed via web store front and payment gateway.</p>
                    </div>
                  </div>
                  <span className="bg-indigo-800/80 text-indigo-200 text-[10px] font-mono px-3 py-1 rounded-full uppercase font-bold border border-indigo-700">
                    Storefront Channel ID: ECOM_WEB
                  </span>
                </div>

                {/* E-Com KPI Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-2 text-left">
                    <span className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest block leading-tight">Digital Web Sales</span>
                    <h3 className="text-lg md:text-2xl font-black text-indigo-950">₹{ecomRevenue.toLocaleString('en-IN')}</h3>
                    <p className="text-[9px] md:text-[10px] text-neutral-400">Confirmed online purchases</p>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-2 text-left">
                    <span className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest block leading-tight">Web Orders Count</span>
                    <h3 className="text-lg md:text-2xl font-black text-indigo-950">{ecomCount} Orders</h3>
                    <p className="text-[9px] md:text-[10px] text-neutral-400">Completed cart checkouts</p>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-2 text-left">
                    <span className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest block leading-tight">Avg Order Value (AOV)</span>
                    <h3 className="text-lg md:text-2xl font-black text-indigo-950">₹{ecomAov.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                    <p className="text-[9px] md:text-[10px] text-neutral-400">Per web transaction average</p>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-2 text-left">
                    <span className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest block leading-tight">E-Com Tax (GST)</span>
                    <h3 className="text-lg md:text-2xl font-black text-indigo-950">₹{ecomGstTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                    <p className="text-[9px] md:text-[10px] text-neutral-400">Collected on online sales</p>
                  </div>
                </div>

                {/* E-Com Pipeline & Category Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Web Fulfillment Pipeline */}
                  <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4 text-left">
                    <h4 className="text-xs font-black uppercase text-neutral-900 tracking-wider">Web Order Fulfillment Pipeline</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-amber-900 block">Payment Verification Pending</span>
                          <span className="text-[9px] text-amber-700">Awaiting owner screenshot review</span>
                        </div>
                        <span className="text-lg font-black text-amber-900">{pendingVerificationOrders.length}</span>
                      </div>

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-blue-900 block">Confirmed & Packing</span>
                          <span className="text-[9px] text-blue-700">Ready for courier dispatch</span>
                        </div>
                        <span className="text-lg font-black text-blue-900">
                          {allOrders.filter(o => o.status === 'Confirmed' || o.status === 'Packed').length}
                        </span>
                      </div>

                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-indigo-900 block">In Transit / Shipped</span>
                          <span className="text-[9px] text-indigo-700">Handed to shipping partner</span>
                        </div>
                        <span className="text-lg font-black text-indigo-900">
                          {allOrders.filter(o => o.status === 'Shipped').length}
                        </span>
                      </div>

                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-emerald-900 block">Successfully Delivered</span>
                          <span className="text-[9px] text-emerald-700">Customer received package</span>
                        </div>
                        <span className="text-lg font-black text-emerald-900">{completedOrdersCount}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t flex justify-between text-xs font-bold text-neutral-600">
                      <span>Delivery Freight Earnings:</span>
                      <span className="text-neutral-900 font-mono">₹{ecomDeliveryCharges.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* E-Commerce Category Chart */}
                  <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm lg:col-span-2 space-y-4 text-left">
                    <h4 className="text-xs font-black uppercase text-neutral-900 tracking-wider">Digital E-Commerce Category Revenue</h4>
                    <p className="text-[10px] text-neutral-400">Revenue contribution per garment category from web orders.</p>
                    
                    <div className="relative h-56 w-full flex items-end justify-between pt-6 px-4 border-b border-neutral-100 bg-neutral-50 rounded-xl">
                      {['Shirts', 'T-Shirts', 'Jeans', 'Trousers', 'Jackets', 'Accessories'].map((cat) => {
                        const catTotal = validOnlineOrders
                          .flatMap(o => o.items)
                          .filter(item => {
                            const prod = allProducts.find(p => p.id === item.productId);
                            return prod ? prod.category === cat : false;
                          })
                          .reduce((sum, item) => sum + (item.price * item.quantity), 0);

                        const height = Math.min(100, Math.max(8, (catTotal / Math.max(1, ecomRevenue)) * 100));

                        return (
                          <div key={cat} className="flex flex-col items-center gap-2 z-10 w-12 group">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute mb-20 bg-indigo-950 text-white text-[10px] font-black py-1 px-2.5 rounded shadow-xl -translate-y-4">
                              ₹{catTotal.toLocaleString('en-IN')}
                            </div>
                            <div 
                              style={{ height: `${height}%` }}
                              className="w-8 bg-gradient-to-t from-indigo-700 to-indigo-500 hover:from-neutral-900 hover:to-neutral-950 rounded-t-md transition-all duration-500 shadow-md"
                            ></div>
                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tight truncate w-full text-center">
                              {cat}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CHANNEL VIEW 2: RETAIL OUTLET POS ONLY */}
            {analyticsChannel === 'RETAIL_POS' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="bg-orange-950 text-white p-4 rounded-2xl border border-orange-800 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-left">
                    <Store className="w-6 h-6 text-orange-400" />
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider">Retail Outlet POS Sales & Analytics</h3>
                      <p className="text-[10px] text-orange-200">In-person cashier counter checkout billing transactions on showroom floor.</p>
                    </div>
                  </div>
                  <span className="bg-orange-800/80 text-orange-200 text-[10px] font-mono px-3 py-1 rounded-full uppercase font-bold border border-orange-700">
                    Storefront Channel ID: POS_SHOWROOM
                  </span>
                </div>

                {/* POS KPI Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-2 text-left">
                    <span className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest block leading-tight">POS Showroom Sales</span>
                    <h3 className="text-lg md:text-2xl font-black text-orange-950">₹{posRevenue.toLocaleString('en-IN')}</h3>
                    <p className="text-[9px] md:text-[10px] text-neutral-400">Cashier desk settled bills</p>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-2 text-left">
                    <span className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest block leading-tight">Invoices / Bills Count</span>
                    <h3 className="text-lg md:text-2xl font-black text-orange-950">{posCount} Bills</h3>
                    <p className="text-[9px] md:text-[10px] text-neutral-400">Printed GST receipts</p>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-2 text-left">
                    <span className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest block leading-tight">Avg Transaction Value</span>
                    <h3 className="text-lg md:text-2xl font-black text-orange-950">₹{posAtv.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                    <p className="text-[9px] md:text-[10px] text-neutral-400">Per walk-in basket average</p>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-2 text-left">
                    <span className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest block leading-tight">POS Tax (CGST + SGST)</span>
                    <h3 className="text-lg md:text-2xl font-black text-orange-950">₹{posGstTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                    <p className="text-[9px] md:text-[10px] text-neutral-400">Collected on store sales</p>
                  </div>
                </div>

                {/* POS Payment Breakdown & Cashier Leaderboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Payment Mode Distribution */}
                  <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4 text-left">
                    <h4 className="text-xs font-black uppercase text-neutral-900 tracking-wider">POS Payment Method Split</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-emerald-700" />
                          <div>
                            <span className="text-xs font-bold text-emerald-950 block">Cash Payments</span>
                            <span className="text-[9px] text-emerald-700">{posCashCount} transactions</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-emerald-950">₹{posCashTotal.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-blue-700" />
                          <div>
                            <span className="text-xs font-bold text-blue-950 block">UPI QR Payments</span>
                            <span className="text-[9px] text-blue-700">{posUpiCount} transactions</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-blue-950">₹{posUpiTotal.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-indigo-700" />
                          <div>
                            <span className="text-xs font-bold text-indigo-950 block">Card Swipes</span>
                            <span className="text-[9px] text-indigo-700">{posCardCount} transactions</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-indigo-950">₹{posCardTotal.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-purple-700" />
                          <div>
                            <span className="text-xs font-bold text-purple-950 block">Split Mode Payments</span>
                            <span className="text-[9px] text-purple-700">{posSplitCount} transactions</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-purple-950">₹{posSplitTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cashier Performance Leaderboard */}
                  <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4 text-left">
                    <h4 className="text-xs font-black uppercase text-neutral-900 tracking-wider">Cashier Counter Performance</h4>
                    <p className="text-[10px] text-neutral-400">Total revenue processed by terminal cashiers.</p>
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {cashierList.length === 0 ? (
                        <div className="text-center py-8 text-neutral-400 text-xs">No cashier transactions logged yet.</div>
                      ) : (
                        cashierList.map((c, idx) => (
                          <div key={c.name} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black flex items-center justify-center">
                                #{idx + 1}
                              </span>
                              <div>
                                <span className="text-xs font-bold text-neutral-900 block">{c.name}</span>
                                <span className="text-[9px] text-neutral-400">{c.count} bills generated</span>
                              </div>
                            </div>
                            <span className="text-sm font-black text-neutral-900">₹{c.total.toLocaleString('en-IN')}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* POS Category Chart */}
                  <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4 text-left">
                    <h4 className="text-xs font-black uppercase text-neutral-900 tracking-wider">In-Store Walk-In Category Revenue</h4>
                    <p className="text-[10px] text-neutral-400">Walk-in customer sales per garment category.</p>
                    
                    <div className="relative h-48 w-full flex items-end justify-between pt-6 px-2 border-b border-neutral-100 bg-neutral-50 rounded-xl">
                      {['Shirts', 'T-Shirts', 'Jeans', 'Trousers', 'Jackets', 'Accessories'].map((cat) => {
                        const catTotal = validPosSales
                          .flatMap(s => s.items)
                          .filter(item => {
                            const prod = allProducts.find(p => p.id === item.productId);
                            return prod ? prod.category === cat : item.productName.toLowerCase().includes(cat.toLowerCase());
                          })
                          .reduce((sum, item) => sum + item.totalAmount, 0);

                        const height = Math.min(100, Math.max(8, (catTotal / Math.max(1, posRevenue)) * 100));

                        return (
                          <div key={cat} className="flex flex-col items-center gap-2 z-10 w-10 group">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute mb-16 bg-orange-950 text-white text-[10px] font-black py-1 px-2 rounded shadow-xl -translate-y-4">
                              ₹{catTotal.toLocaleString('en-IN')}
                            </div>
                            <div 
                              style={{ height: `${height}%` }}
                              className="w-6 bg-gradient-to-t from-orange-600 to-orange-400 hover:from-neutral-900 hover:to-neutral-950 rounded-t-md transition-all duration-500 shadow-md"
                            ></div>
                            <span className="text-[8px] font-black text-neutral-400 uppercase tracking-tight truncate w-full text-center">
                              {cat}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CHANNEL VIEW 3: COMBINED OMNICHANNEL OVERVIEW */}
            {analyticsChannel === 'COMBINED' && (
              <div className="space-y-8 animate-fadeIn">
                {/* Bento statistics grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  
                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-2 md:space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest leading-tight">Combined Gross Revenue</span>
                      <div className="p-1.5 md:p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                        <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg md:text-2xl font-black text-neutral-950">₹{combinedRevenue.toLocaleString('en-IN')}</h3>
                      <p className="text-[9px] md:text-[10px] text-neutral-400 mt-0.5 md:mt-1">E-Com (₹{ecomRevenue.toLocaleString('en-IN')}) + POS (₹{posRevenue.toLocaleString('en-IN')})</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-2 md:space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest leading-tight">Digital E-Com Share</span>
                      <div className="p-1.5 md:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                        <Globe className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg md:text-2xl font-black text-indigo-950">₹{ecomRevenue.toLocaleString('en-IN')}</h3>
                      <p className="text-[9px] md:text-[10px] text-indigo-600 font-bold mt-0.5 md:mt-1">{ecomSharePct}% of total ({ecomCount} orders)</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-2 md:space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest leading-tight">Retail POS Share</span>
                      <div className="p-1.5 md:p-2.5 bg-orange-50 text-orange-500 rounded-xl shrink-0">
                        <Store className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg md:text-2xl font-black text-orange-950">₹{posRevenue.toLocaleString('en-IN')}</h3>
                      <p className="text-[9px] md:text-[10px] text-orange-600 font-bold mt-0.5 md:mt-1">{posSharePct}% of total ({posCount} bills)</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-neutral-100 shadow-xs space-y-2 md:space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] md:text-[10px] font-black uppercase text-neutral-400 tracking-widest leading-tight">Low Stock Alerts</span>
                      <div className={`p-1.5 md:p-2.5 rounded-xl shrink-0 ${lowStockProducts.length > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-neutral-50 text-neutral-400'}`}>
                        <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg md:text-2xl font-black text-neutral-950">{lowStockProducts.length} Items</h3>
                      <p className="text-[9px] md:text-[10px] text-neutral-400 mt-0.5 md:mt-1">Under 5 stock remaining</p>
                    </div>
                  </div>

                </div>

                {/* Channel Share Percentage Visual Bar */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-3 text-left">
                  <div className="flex justify-between items-center text-xs font-black uppercase">
                    <span className="text-indigo-700 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Digital E-Commerce ({ecomSharePct}%)</span>
                    <span className="text-orange-700 flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> Retail Outlet POS ({posSharePct}%)</span>
                  </div>
                  <div className="w-full h-4 bg-neutral-100 rounded-full overflow-hidden flex p-0.5 border">
                    <div style={{ width: `${ecomSharePct}%` }} className="bg-indigo-600 h-full rounded-l-full transition-all duration-500"></div>
                    <div style={{ width: `${posSharePct}%` }} className="bg-orange-500 h-full rounded-r-full transition-all duration-500"></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Dual Channel Category Comparison Bar Chart */}
                  <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm lg:col-span-2 space-y-6 text-left">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-base font-black text-neutral-950 uppercase tracking-tight">Category Sales: E-Com vs POS Comparison</h3>
                        <p className="text-xs text-neutral-400">Garment revenue generated online vs in-store side-by-side</p>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-black uppercase">
                        <span className="flex items-center gap-1 text-indigo-700"><span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span> E-Com</span>
                        <span className="flex items-center gap-1 text-orange-700"><span className="w-2.5 h-2.5 bg-orange-500 rounded-full"></span> Retail POS</span>
                      </div>
                    </div>

                    <div className="relative h-64 w-full flex items-end justify-between pt-6 px-4 border-b border-neutral-100 bg-neutral-50 rounded-xl">
                      {['Shirts', 'T-Shirts', 'Jeans', 'Trousers', 'Jackets', 'Accessories'].map((cat) => {
                        const ecomCatTotal = validOnlineOrders
                          .flatMap(o => o.items)
                          .filter(item => {
                            const prod = allProducts.find(p => p.id === item.productId);
                            return prod ? prod.category === cat : false;
                          })
                          .reduce((sum, item) => sum + (item.price * item.quantity), 0);

                        const posCatTotal = validPosSales
                          .flatMap(s => s.items)
                          .filter(item => {
                            const prod = allProducts.find(p => p.id === item.productId);
                            return prod ? prod.category === cat : item.productName.toLowerCase().includes(cat.toLowerCase());
                          })
                          .reduce((sum, item) => sum + item.totalAmount, 0);

                        const maxScale = Math.max(1, combinedRevenue / 3);
                        const ecomH = Math.min(100, Math.max(6, (ecomCatTotal / maxScale) * 100));
                        const posH = Math.min(100, Math.max(6, (posCatTotal / maxScale) * 100));

                        return (
                          <div key={cat} className="flex flex-col items-center gap-2 z-10 group">
                            <div className="flex items-end gap-1">
                              <div 
                                style={{ height: `${ecomH}%` }}
                                className="w-4 bg-indigo-600 hover:bg-indigo-800 rounded-t transition-all shadow-xs"
                                title={`E-Com: ₹${ecomCatTotal.toLocaleString('en-IN')}`}
                              ></div>
                              <div 
                                style={{ height: `${posH}%` }}
                                className="w-4 bg-orange-500 hover:bg-orange-700 rounded-t transition-all shadow-xs"
                                title={`POS: ₹${posCatTotal.toLocaleString('en-IN')}`}
                              ></div>
                            </div>
                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tight truncate max-w-[60px] text-center">
                              {cat}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Low Stock Alerts & Fast Replenish Panel */}
                  <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4 flex flex-col text-left">
                    <div>
                      <h3 className="text-base font-black text-neutral-950 uppercase tracking-tight flex items-center gap-1.5">
                        <AlertTriangle className="text-red-500 w-4 h-4" />
                        Low Stock Alerts
                      </h3>
                      <p className="text-xs text-neutral-400">Garment inventory replenishment needed</p>
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
                              <img src={p.images[0]} className="w-10 h-12 object-cover rounded" referrerPolicy="no-referrer" />
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

                    <div className="sm:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-black uppercase text-orange-600">
                          Unique SKU ID (Stock Keeping Unit) *
                        </label>
                        <button
                          type="button"
                          onClick={() => setProductSku(generateUniqueSku(productCategory, productName))}
                          className="text-[9px] font-bold text-orange-700 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-2.5 py-0.5 rounded border border-orange-200 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-orange-500" /> Auto-Generate SKU
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={productSku}
                        onChange={(e) => setProductSku(e.target.value.toUpperCase())}
                        placeholder="e.g. RNG-SHI-8923"
                        className="w-full p-2.5 border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg text-xs font-mono font-bold tracking-wider text-neutral-900 bg-orange-50/20 uppercase"
                      />
                      <p className="text-[9px] text-neutral-400 mt-1">
                        Unique identifier used by cashiers to instantly search and scan items in POS Billing.
                      </p>
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

                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">GST Tax Rate % *</label>
                      <select
                        value={productGstPercent}
                        onChange={(e) => setProductGstPercent(Number(e.target.value))}
                        className="w-full p-2.5 border border-neutral-200 bg-white rounded-lg text-xs font-bold"
                      >
                        <option value={0}>0% (Exempt)</option>
                        <option value={5}>5% (Standard Apparel &lt; ₹1000)</option>
                        <option value={12}>12% (Apparel &gt; ₹1000 / Textiles)</option>
                        <option value={18}>18% (Luxury / Accessories)</option>
                        <option value={28}>28% (Special Goods)</option>
                      </select>
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
                      <th className="p-4">Price (MRP / Offer)</th>
                      <th className="p-4">GST Rate %</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4">Collections</th>
                      <th className="p-4 text-right pr-6">Catalog Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-xs text-neutral-700">
                    {filteredProducts.map((p) => {
                      const currentGst = p.gstPercent !== undefined ? p.gstPercent : 5;
                      const taxable = p.offerPrice / (1 + (currentGst / 100));

                      return (
                        <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="p-4 pl-6 flex items-center gap-3.5">
                            <img src={p.images[0]} className="w-10 h-13 object-cover rounded-lg bg-neutral-100 border border-neutral-200" referrerPolicy="no-referrer" />
                            <div>
                              <span className="font-extrabold text-neutral-900 block">{p.name}</span>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-neutral-400 uppercase font-bold">{p.brand}</span>
                                <span className="font-mono bg-orange-100 text-orange-900 text-[9px] font-black px-1.5 py-0.5 rounded border border-orange-200 uppercase">
                                  SKU: {p.sku || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="bg-neutral-100 px-2.5 py-1 rounded-full font-bold text-[10px]">
                              {p.category}
                            </span>
                          </td>
                          <td className="p-4 font-bold">
                            <div className="space-y-1">
                              <span className="text-neutral-900 block">Offer: ₹{p.offerPrice}</span>
                              <span className="text-[10px] text-neutral-400 block font-medium">MRP: ₹{p.price}</span>
                              <span className="text-[9px] text-orange-600 block font-bold">Taxable: ₹{taxable.toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <select
                              value={currentGst}
                              onChange={(e) => handleQuickUpdateGstAndPrice(p, p.price, p.offerPrice, Number(e.target.value))}
                              className="bg-orange-50 border border-orange-200 text-orange-700 font-extrabold px-2 py-1 rounded text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-400"
                            >
                              <option value={0}>0% (Exempt)</option>
                              <option value={5}>5% GST</option>
                              <option value={12}>12% GST</option>
                              <option value={18}>18% GST</option>
                              <option value={28}>28% GST</option>
                            </select>
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
                                title="Edit product parameters & GST"
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
                      );
                    })}
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

        {/* TAB 5: CATEGORIES MANAGER */}
        {activeTab === 'categories' && (
          <div className="space-y-8 animate-fadeIn text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-neutral-950 dark:text-white">Store Categories Catalog</h2>
                <p className="text-xs text-neutral-400">Add, edit, or remove wardrobe categories that dynamically map to your storefront.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Add/Edit Form */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs space-y-4 h-fit">
                <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest block">
                  {editingCategoryId ? 'Modify Category' : 'Provision Category'}
                </span>
                
                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Category Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cord Sets, Tracks, Jackets"
                      value={categoryNameInput}
                      onChange={(e) => setCategoryNameInput(e.target.value)}
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-colors"
                    >
                      {submitting ? 'Saving...' : editingCategoryId ? 'Update Category' : 'Add Category'}
                    </button>
                    {editingCategoryId && (
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryNameInput('');
                          setEditingCategoryId(null);
                        }}
                        className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-black text-xs uppercase px-4 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Category List */}
              <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs space-y-4">
                <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block">Active Store Categories</span>
                
                <div className="divide-y divide-neutral-100">
                  {categories.map((cat) => (
                    <div key={cat} className="py-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-sm text-neutral-900">{cat}</span>
                        <div className="text-[10px] text-neutral-400">
                          {allProducts.filter(p => p.category.toLowerCase() === cat.toLowerCase()).length} associated products
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCategoryNameInput(cat);
                            setEditingCategoryId(cat.toLowerCase());
                          }}
                          className="p-1.5 hover:bg-neutral-50 text-neutral-600 rounded-lg border border-neutral-100"
                          title="Edit category name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg border border-neutral-100 hover:border-red-100"
                          title="Delete category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DELIVERY & LOGISTICS SETTINGS */}
        {activeTab === 'logistics' && (
          <div className="space-y-8 animate-fadeIn text-left max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-neutral-950 dark:text-white">Logistics & Shipping Settings</h2>
              <p className="text-xs text-neutral-400">Configure delivery charges, threshold limits, and manage local express delivery eligibility.</p>
            </div>

            <form onSubmit={handleSaveLogistics} className="bg-white p-6 md:p-8 rounded-2xl border border-neutral-100 shadow-2xs space-y-6">
              <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest block">Logistics Strategy Configuration</span>
              
              {/* Express Delivery Switch */}
              <div className="flex items-center justify-between p-4 bg-orange-50/10 border border-orange-100 rounded-xl">
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-neutral-900 uppercase block">Enable Express Fast Delivery</span>
                  <p className="text-[10px] text-neutral-400">Allow same-day, localized ultra-fast delivery options during checkout.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={logisticsExpressEnabled} 
                    onChange={(e) => setLogisticsExpressEnabled(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Normal Delivery Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={logisticsNormalCharge}
                    onChange={(e) => setLogisticsNormalCharge(Number(e.target.value))}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Express Delivery Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    disabled={!logisticsExpressEnabled}
                    value={logisticsExpressCharge}
                    onChange={(e) => setLogisticsExpressCharge(Number(e.target.value))}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Free Delivery Threshold (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={logisticsFreeThreshold}
                    onChange={(e) => setLogisticsFreeThreshold(Number(e.target.value))}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Eligible Same-Day Express Locations</label>
                <textarea
                  disabled={!logisticsExpressEnabled}
                  value={logisticsLocationsInput}
                  onChange={(e) => setLogisticsLocationsInput(e.target.value)}
                  placeholder="e.g. Tiruchirappalli, Tennur, Srirangam, Cantonment"
                  rows={3}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs disabled:opacity-50"
                />
                <p className="text-[9px] text-neutral-400 mt-1">Separate eligible express delivery locations with commas (e.g. Trichy, Tennur, Thillai Nagar).</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-colors"
              >
                {submitting ? 'Saving Configurations...' : 'Save Logistics Settings'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 7: POS BILLING SCREEN */}
        {activeTab === 'pos-billing' && (
          <POSBilling 
            products={allProducts} 
            coupons={allCoupons} 
            currentUser={currentEmployee ? { uid: currentEmployee.id, displayName: currentEmployee.name, email: currentEmployee.email } : null}
            onRefreshData={onRefreshData}
            businessSettings={businessProfile}
          />
        )}

        {/* TAB 8: CENTRAL INVENTORY LEDGER */}
        {activeTab === 'pos-inventory' && (
          <InventoryManager 
            products={allProducts} 
            onRefreshData={onRefreshData} 
            triggerGlobalAlert={(type, text) => triggerAlert(type, text)}
          />
        )}

        {/* TAB 10: BULK PURCHASES */}
        {activeTab === 'pos-purchases' && (
          <PurchasesManager 
            products={allProducts} 
            onRefreshData={onRefreshData} 
            triggerGlobalAlert={(type, text) => triggerAlert(type, text)}
          />
        )}

        {/* TAB 11: LOYALTY & WALLET */}
        {activeTab === 'pos-customers' && (
          <CustomersLoyalty 
            onRefreshData={onRefreshData} 
            triggerGlobalAlert={(type, text) => triggerAlert(type, text)}
          />
        )}

        {/* TAB 13: PROFIT & LOSS / GST TAX ANALYTICS */}
        {activeTab === 'pos-reports' && (
          <POSReports 
            products={allProducts} 
            allOnlineOrders={allOrders}
          />
        )}

        {/* TAB 14: CORPORATE SHOWROOM SETTINGS */}
        {activeTab === 'pos-settings' && (
          <SettingsManager 
            onRefreshData={onRefreshData} 
            triggerGlobalAlert={(type, text) => triggerAlert(type, text)}
          />
        )}

      </div>
    </div>
  );
}
