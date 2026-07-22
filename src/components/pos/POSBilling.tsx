import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, getDocs, doc, runTransaction, getDoc, addDoc 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Product, POSSale, POSCustomer, Coupon } from '../../types';
import { 
  Search, Plus, Minus, Trash2, Receipt, CreditCard, Landmark, 
  User, Sparkles, AlertCircle, CheckCircle, Barcode, HelpCircle, Printer, X 
} from 'lucide-react';

interface POSBillingProps {
  products: Product[];
  coupons: Coupon[];
  currentUser: { uid: string; displayName?: string; email?: string } | null;
  onRefreshData: () => void;
  businessSettings: {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    storeEmail: string;
    storeGstin: string;
    upiQrUrl?: string;
  };
}

export default function POSBilling({
  products,
  coupons,
  currentUser,
  onRefreshData,
  businessSettings
}: POSBillingProps) {
  // POS Cart State
  const [cart, setCart] = useState<{
    product: Product;
    quantity: number;
    size: string;
    color: string;
    customUnitPrice?: number;
    gstPercent?: number;
  }[]>([]);

  // Search & Scanner
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  // Customer Details
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGst, setCustomerGst] = useState('');
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [matchedCustomer, setMatchedCustomer] = useState<POSCustomer | null>(null);

  // Billing & Taxes Settings
  const [discountValue, setDiscountValue] = useState(0); // Flat Manual Discount
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [packingCharge, setPackingCharge] = useState(0);

  // Payment State
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Split'>('Cash');
  const [cashAmount, setCashAmount] = useState(0);
  const [upiAmount, setUpiAmount] = useState(0);

  // Status & Transaction Alerts
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [printedSale, setPrintedSale] = useState<POSSale | null>(null);

  // USB Barcode Scanner Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      // If time between keystrokes is very fast (< 50ms), it's likely a hardware scanner
      if (now - lastKeyTime.current > 50) {
        barcodeBuffer.current = '';
      }
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          const barcode = barcodeBuffer.current;
          barcodeBuffer.current = '';
          e.preventDefault();
          handleBarcodeScanned(barcode);
        }
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, cart]);

  // Handle scanned barcode
  const handleBarcodeScanned = (barcode: string) => {
    const item = products.find(p => p.barcode === barcode || p.sku === barcode);
    if (item) {
      if (item.stock <= 0) {
        triggerAlert('error', `Product "${item.name}" is OUT OF STOCK.`);
        return;
      }
      addToCart(item);
      triggerAlert('success', `Scanned: ${item.name}`);
    } else {
      triggerAlert('error', `Product with SKU/Barcode "${barcode}" not found.`);
    }
  };

  // Search product filters
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.includes(searchQuery) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const triggerAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Add item to cart
  const addToCart = (product: Product, size?: string, color?: string) => {
    const selectedSize = size || product.sizes[0] || 'Free Size';
    const selectedColor = color || product.colors[0] || 'Standard';

    const existingIndex = cart.findIndex(item => 
      item.product.id === product.id && 
      item.size === selectedSize && 
      item.color === selectedColor
    );

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.stock) {
        triggerAlert('error', `Cannot add more. Max available stock is ${product.stock}.`);
        return;
      }
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { product, quantity: 1, size: selectedSize, color: selectedColor }]);
    }
  };

  // Update quantity in cart
  const updateQuantity = (index: number, change: number) => {
    const item = cart[index];
    const newQty = item.quantity + change;
    if (newQty <= 0) {
      const newCart = [...cart];
      newCart.splice(index, 1);
      setCart(newCart);
      return;
    }
    if (newQty > item.product.stock) {
      triggerAlert('error', `Only ${item.product.stock} units available in live stock.`);
      return;
    }
    const newCart = [...cart];
    newCart[index].quantity = newQty;
    setCart(newCart);
  };

  // Remove item
  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // Customer Loyalty Quick Search
  const lookupCustomerByPhone = async (phone: string) => {
    setCustomerPhone(phone);
    if (phone.length < 10) {
      setMatchedCustomer(null);
      return;
    }
    try {
      const snap = await getDocs(collection(db, 'pos_customers'));
      let found: POSCustomer | null = null;
      snap.forEach(doc => {
        const data = doc.data() as POSCustomer;
        if (data.phone === phone) {
          found = { id: doc.id, ...data };
        }
      });
      if (found) {
        setMatchedCustomer(found);
        setCustomerName(found.name);
        setCustomerAddress(found.address || '');
        setCustomerGst(found.gstin || '');
        triggerAlert('success', `Loyalty Card Found! Points: ${found.loyaltyPoints}`);
      } else {
        setMatchedCustomer(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Coupon lookup
  const applyPromoCoupon = () => {
    if (!couponCode) return;
    const coup = coupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase());
    if (coup) {
      if (!coup.isActive) {
        triggerAlert('error', 'Coupon code is currently inactive.');
        return;
      }
      if (subTotalTaxable < coup.minPurchase) {
        triggerAlert('error', `Minimum purchase of ₹${coup.minPurchase} required to apply.`);
        return;
      }
      setAppliedCoupon(coup);
      triggerAlert('success', `Coupon "${coup.code}" applied!`);
    } else {
      triggerAlert('error', 'Invalid coupon code.');
    }
  };

  // Math totals
  const subTotalTaxable = cart.reduce((sum, item) => {
    // Determine selling base price (with custom unit price override if specified)
    const basePrice = item.customUnitPrice !== undefined ? item.customUnitPrice : (item.product.offerPrice || item.product.price);
    // GST calculations (Indian retail usually prices inclusive of tax)
    const gstPct = item.gstPercent !== undefined ? item.gstPercent : (item.product.gstPercent || 5);
    const itemTaxable = basePrice / (1 + (gstPct / 100));
    return sum + (itemTaxable * item.quantity);
  }, 0);

  const gstBreakdown = cart.reduce((sum, item) => {
    const basePrice = item.customUnitPrice !== undefined ? item.customUnitPrice : (item.product.offerPrice || item.product.price);
    const gstPct = item.gstPercent !== undefined ? item.gstPercent : (item.product.gstPercent || 5);
    const taxableAmount = basePrice / (1 + (gstPct / 100));
    const taxValue = (basePrice - taxableAmount) * item.quantity;
    return sum + taxValue;
  }, 0);

  // Base raw price total
  const rawTotalAmount = cart.reduce((sum, item) => {
    const unitP = item.customUnitPrice !== undefined ? item.customUnitPrice : (item.product.offerPrice || item.product.price);
    return sum + (unitP * item.quantity);
  }, 0);

  // Promo Coupon deduction
  let couponDeduction = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      couponDeduction = (rawTotalAmount * appliedCoupon.value) / 100;
    } else {
      couponDeduction = appliedCoupon.value;
    }
  }

  // Combined discount (manual + coupon + loyalty)
  const loyaltyDeduction = loyaltyPointsToRedeem * 1; // 1 point = ₹1
  const totalDeductions = discountValue + couponDeduction + loyaltyDeduction;

  // Final summary
  const subTotalAfterDeductions = Math.max(0, rawTotalAmount - totalDeductions);
  const roundOffValue = Math.round(subTotalAfterDeductions + shippingCharge + packingCharge) - (subTotalAfterDeductions + shippingCharge + packingCharge);
  const netPayable = Math.max(0, Math.round(subTotalAfterDeductions + shippingCharge + packingCharge));

  // Handle Split amounts default sync
  useEffect(() => {
    if (paymentMode !== 'Split') {
      setCashAmount(paymentMode === 'Cash' ? netPayable : 0);
      setUpiAmount(paymentMode === 'UPI' ? netPayable : 0);
    }
  }, [paymentMode, netPayable]);

  // Process checkout with Firestore Transaction to secure real-time stock levels!
  const handleBillCheckout = async () => {
    if (cart.length === 0) {
      triggerAlert('error', 'The POS Cart is empty!');
      return;
    }

    if (paymentMode === 'Split') {
      const splitTotal = Number(cashAmount) + Number(upiAmount);
      if (Math.abs(splitTotal - netPayable) > 1) {
        triggerAlert('error', `Split payment sum (₹${splitTotal}) must match net payable (₹${netPayable}).`);
        return;
      }
    }

    setSubmitting(true);
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}-POS`;

    try {
      // Execute multi-document ACID Transaction
      await runTransaction(db, async (transaction) => {
        const productUpdates: { ref: any; newStock: number; newStoreStock: number }[] = [];

        // 1. Fetch & lock only the specific cart items in transaction (lightning fast)
        for (const cartItem of cart) {
          const productRef = doc(db, 'products', cartItem.product.id);
          const productSnap = await transaction.get(productRef);

          if (!productSnap.exists()) {
            throw new Error(`Product "${cartItem.product.name}" (ID: ${cartItem.product.id}) not found in database catalog.`);
          }

          const freshData = productSnap.data() as Product;

          if (freshData.stock < cartItem.quantity) {
            throw new Error(`Insufficient stock for "${cartItem.product.name}". Available live stock is only ${freshData.stock} units.`);
          }

          const newStock = freshData.stock - cartItem.quantity;
          const newStoreStock = (freshData.storeStock || freshData.stock) - cartItem.quantity;

          productUpdates.push({
            ref: productRef,
            newStock,
            newStoreStock: Math.max(0, newStoreStock)
          });
        }

        // 2. Perform atomic stock decrements
        for (const update of productUpdates) {
          transaction.update(update.ref, {
            stock: update.newStock,
            storeStock: update.newStoreStock,
            updatedDate: new Date().toISOString()
          });
        }

        // 3. Handle loyalty points reward and customer records
        let finalCustomerId = matchedCustomer?.id || '';
        const pointsEarned = Math.floor(netPayable / 100); // 1% points back

        if (customerPhone.length >= 10) {
          if (matchedCustomer) {
            const custRef = doc(db, 'pos_customers', matchedCustomer.id);
            const finalPoints = matchedCustomer.loyaltyPoints - loyaltyPointsToRedeem + pointsEarned;
            transaction.update(custRef, {
              loyaltyPoints: finalPoints,
              updatedAt: new Date().toISOString()
            });
          } else {
            // Create brand new POS Customer record directly
            const newCustId = `cust_${Date.now()}`;
            finalCustomerId = newCustId;
            const newCustRef = doc(db, 'pos_customers', newCustId);
            transaction.set(newCustRef, {
              id: newCustId,
              name: customerName || 'Walk-in Customer',
              phone: customerPhone,
              address: customerAddress,
              gstin: customerGst,
              loyaltyPoints: pointsEarned,
              walletBalance: 0,
              createdDate: new Date().toISOString()
            });
          }
        }

        // 4. Record Invoice document
        const saleId = `sale_${Date.now()}`;
        const saleRef = doc(db, 'pos_sales', saleId);

        // Prep line items
        const invoiceItems = cart.map(item => {
          const sellingPrice = item.product.offerPrice || item.product.price;
          const gstPct = item.gstPercent !== undefined ? item.gstPercent : (item.product.gstPercent || 5);
          const taxable = sellingPrice / (1 + (gstPct / 100));
          const taxAmt = sellingPrice - taxable;

          return {
            productId: item.product.id,
            productName: item.product.name,
            sku: item.product.sku || 'N/A',
            barcode: item.product.barcode || '',
            quantity: item.quantity,
            sellingPrice: sellingPrice,
            mrp: item.product.mrp || sellingPrice,
            gstPercent: gstPct,
            hsnCode: item.product.hsnCode || '6203', // default fashion apparel HSN
            taxableAmount: Number(taxable.toFixed(2)),
            cgst: Number((taxAmt / 2).toFixed(2)),
            sgst: Number((taxAmt / 2).toFixed(2)),
            igst: 0, // In-store retail uses CGST/SGST by default
            totalAmount: sellingPrice * item.quantity
          };
        });

        const newSale: POSSale = {
          id: saleId,
          invoiceNumber: invoiceNum,
          customerId: finalCustomerId,
          customerName: customerName || 'Walk-in Customer',
          customerPhone: customerPhone || 'N/A',
          customerAddress: customerAddress || '',
          customerGst: customerGst || '',
          items: invoiceItems,
          subTotal: Number(subTotalTaxable.toFixed(2)),
          taxTotal: Number(gstBreakdown.toFixed(2)),
          discountAmount: totalDeductions,
          couponCode: appliedCoupon?.code || '',
          shippingCharge: shippingCharge,
          packingCharge: packingCharge,
          roundOff: Number(roundOffValue.toFixed(2)),
          grandTotal: netPayable,
          paymentMode: paymentMode,
          cashierId: currentUser?.uid || 'cashier_01',
          cashierName: currentUser?.displayName || 'Active Cashier',
          createdAt: new Date().toISOString(),
          status: 'Completed'
        };

        if (paymentMode === 'Split') {
          newSale.splitDetails = {
            cashAmount: Number(cashAmount),
            upiAmount: Number(upiAmount),
            cardAmount: 0
          };
        }

        transaction.set(saleRef, newSale);

        // Save activity log
        const logId = `log_${Date.now()}`;
        const logRef = doc(db, 'activity_logs', logId);
        transaction.set(logRef, {
          id: logId,
          employeeId: currentUser?.uid || 'cashier_01',
          employeeName: currentUser?.displayName || 'Active Cashier',
          action: `POS Billing Invoice #${invoiceNum}`,
          details: `Billed ₹${netPayable} with ${cart.length} apparel items. Payment mode: ${paymentMode}`,
          timestamp: new Date().toISOString()
        });

        // Set as printed for printable modal
        setPrintedSale(newSale);
      });

      triggerAlert('success', `Invoice ${invoiceNum} generated & stock synced successfully!`);
      // Reset state
      setCart([]);
      setCustomerPhone('');
      setCustomerName('');
      setCustomerAddress('');
      setCustomerGst('');
      setDiscountValue(0);
      setCouponCode('');
      setAppliedCoupon(null);
      setLoyaltyPointsToRedeem(0);
      setMatchedCustomer(null);
      onRefreshData();

    } catch (err: any) {
      console.error(err);
      triggerAlert('error', 'Checkout transaction failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-gst-invoice');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>A4 TAX GST INVOICE - Rightnow Garments</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @media print {
              body { margin: 1cm; font-family: monospace; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body class="p-8 bg-white text-black font-mono">
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
      {/* LEFT COLUMN: PRODUCT SEARCH, LIVE VIEW & SCANNER (8/12) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Dynamic USB Scanner Alert */}
        <div className="bg-neutral-900 text-amber-400 p-4 rounded-2xl flex items-center justify-between border border-neutral-800 shadow-sm">
          <div className="flex items-center gap-3">
            <Barcode className="w-5 h-5 animate-pulse" />
            <div className="text-left">
              <span className="font-black text-xs uppercase tracking-widest block">USB Scanner Active</span>
              <p className="text-[10px] text-neutral-400">Aim gun, scan garment barcode, or type SKU below.</p>
            </div>
          </div>
          <span className="text-[9px] bg-neutral-800 text-neutral-400 py-1 px-2.5 rounded-lg border border-neutral-700/50 uppercase font-bold font-mono">
            Direct Link
          </span>
        </div>

        {/* Searching input bar */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs space-y-4 relative">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search garments by SKU ID (e.g. RNG-SHI-101), Name, Category, or Barcode..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim().length > 0) {
                  e.preventDefault();
                  const queryClean = searchQuery.trim().toUpperCase();

                  // 1. First check exact SKU match
                  const exactSkuMatch = products.find(p => p.sku?.toUpperCase() === queryClean);
                  if (exactSkuMatch) {
                    if (exactSkuMatch.stock <= 0) {
                      triggerAlert('error', `Product "${exactSkuMatch.name}" (SKU: ${exactSkuMatch.sku}) is OUT OF STOCK.`);
                    } else {
                      addToCart(exactSkuMatch);
                      triggerAlert('success', `Added by SKU (${exactSkuMatch.sku}): ${exactSkuMatch.name}`);
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }
                    return;
                  }

                  // 2. Check exact Barcode match
                  const exactBarcodeMatch = products.find(p => p.barcode === queryClean);
                  if (exactBarcodeMatch) {
                    if (exactBarcodeMatch.stock <= 0) {
                      triggerAlert('error', `Product "${exactBarcodeMatch.name}" is OUT OF STOCK.`);
                    } else {
                      addToCart(exactBarcodeMatch);
                      triggerAlert('success', `Added by Barcode: ${exactBarcodeMatch.name}`);
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }
                    return;
                  }

                  // 3. Single search result
                  if (filteredProducts.length === 1) {
                    const singleItem = filteredProducts[0];
                    if (singleItem.stock <= 0) {
                      triggerAlert('error', `Product "${singleItem.name}" is OUT OF STOCK.`);
                    } else {
                      addToCart(singleItem);
                      triggerAlert('success', `Added: ${singleItem.name}`);
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }
                  }
                }
              }}
              className="w-full pl-10 pr-4 py-3 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-xl text-xs bg-neutral-50/50 font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Dropdown Panel */}
          {showSearchResults && searchQuery.length > 0 && (
            <div className="absolute left-0 right-0 top-16 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 max-h-80 overflow-y-auto mt-1 divide-y divide-neutral-100">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-neutral-400 text-xs">
                  No garments matching SKU or query "{searchQuery}"
                </div>
              ) : (
                filteredProducts.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => {
                      if (p.stock <= 0) {
                        triggerAlert('error', `Product "${p.name}" is currently OUT OF STOCK.`);
                        return;
                      }
                      addToCart(p);
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }}
                    className="p-3 hover:bg-orange-50/50 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img src={p.images[0]} className="w-9 h-11 object-cover rounded-md" referrerPolicy="no-referrer" />
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-neutral-900">{p.name}</span>
                          <span className="font-mono bg-orange-100 text-orange-900 font-black px-1.5 py-0.5 rounded text-[9px] border border-orange-200 uppercase">
                            SKU: {p.sku || 'N/A'}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold block mt-0.5">
                          Category: {p.category} • GST: {p.gstPercent || 5}% • Brand: {p.brand}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-neutral-950 block">₹{p.offerPrice || p.price}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        p.stock <= 0 ? 'bg-red-50 text-red-600' : p.stock <= 5 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {p.stock <= 0 ? 'Out of stock' : `${p.stock} left`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* POS Cart Items Listing */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="bg-neutral-50 border-b border-neutral-100 px-5 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">Garment POS Cart ({cart.length} lines)</h3>
            </div>
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])}
                className="text-red-500 hover:text-red-700 text-[10px] uppercase font-black"
              >
                Clear Cart
              </button>
            )}
          </div>

          <div className="divide-y divide-neutral-100 max-h-[460px] overflow-y-auto scrollbar-thin">
            {cart.length === 0 ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-12 h-12 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mx-auto">
                  <Barcode className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-neutral-500">POS Cart is Empty</p>
                  <p className="text-[10px] text-neutral-400 max-w-xs mx-auto mt-1">Scan labels using gun or use the search bar above to load fashion apparel items.</p>
                </div>
              </div>
            ) : (
              cart.map((item, idx) => {
                const basePrice = item.customUnitPrice !== undefined ? item.customUnitPrice : (item.product.offerPrice || item.product.price);
                const gst = item.gstPercent !== undefined ? item.gstPercent : (item.product.gstPercent || 5);
                const taxable = basePrice / (1 + (gst / 100));

                return (
                  <div key={`${item.product.id}-${item.size}-${item.color}-${idx}`} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-neutral-50/50">
                    <div className="flex items-center gap-3">
                      <img src={item.product.images[0]} className="w-10 h-13 object-cover rounded" referrerPolicy="no-referrer" />
                      <div className="text-left">
                        <span className="font-bold text-xs text-neutral-900 line-clamp-1">{item.product.name}</span>
                        <div className="flex flex-wrap gap-2 mt-1 text-[9px] uppercase font-bold text-neutral-400 items-center">
                          <span className="font-mono bg-orange-100 text-orange-900 font-black px-1.5 py-0.5 rounded border border-orange-200">
                            SKU: {item.product.sku || 'N/A'}
                          </span>
                          <span className="bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">Size: {item.size}</span>
                          <span className="bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">Color: {item.color}</span>
                          
                          {/* GST Rate Selector */}
                          <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">
                            <span className="text-[9px] font-black text-orange-700">GST %:</span>
                            <select
                              value={gst}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const newCart = [...cart];
                                newCart[idx].gstPercent = val;
                                setCart(newCart);
                              }}
                              className="bg-transparent text-orange-700 text-[9px] font-black outline-none cursor-pointer"
                            >
                              <option value={0}>0%</option>
                              <option value={5}>5%</option>
                              <option value={12}>12%</option>
                              <option value={18}>18%</option>
                              <option value={28}>28%</option>
                            </select>
                          </div>
                        </div>

                        {/* Price Unit Edit Input */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-bold text-neutral-500">Unit Price (₹):</span>
                          <input
                            type="number"
                            value={basePrice}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              const newCart = [...cart];
                              newCart[idx].customUnitPrice = val;
                              setCart(newCart);
                            }}
                            className="w-20 px-2 py-0.5 border border-neutral-300 rounded text-xs font-black text-neutral-900 bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <span className="text-[9px] text-neutral-400">Taxable: ₹{taxable.toFixed(2)} | CGST/SGST: ₹{((basePrice - taxable) / 2).toFixed(2)} each</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                      {/* Quantity buttons */}
                      <div className="flex items-center border border-neutral-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                        <button 
                          onClick={() => updateQuantity(idx, -1)}
                          className="px-2 py-1 hover:bg-neutral-50 text-neutral-500"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 py-1 font-black text-xs text-neutral-900">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(idx, 1)}
                          className="px-2 py-1 hover:bg-neutral-50 text-neutral-500"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-neutral-900 block">₹{(basePrice * item.quantity).toLocaleString('en-IN')}</span>
                        <button 
                          onClick={() => removeFromCart(idx)}
                          className="text-red-500 hover:text-red-700 mt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: TAX BILLING SUMMARY, CUSTOMER & CHECKOUT (5/12) */}
      <div className="lg:col-span-5 space-y-6">
        {/* Customer Database Lookup */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-orange-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-950">Customer Details (Loyalty Hub)</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Mobile Phone (Lookup) *</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={(e) => lookupCustomerByPhone(e.target.value)}
                className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Customer Name</label>
              <input
                type="text"
                placeholder="Walk-In Customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">GSTIN Number (Optional)</label>
              <input
                type="text"
                placeholder="33AAAAA1111A1Z1"
                value={customerGst}
                onChange={(e) => setCustomerGst(e.target.value)}
                className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs uppercase focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          {matchedCustomer && (
            <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Privileged Loyalty Customer
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Points Balance: {matchedCustomer.loyaltyPoints} (₹{matchedCustomer.loyaltyPoints} Value)</span>
              </div>
              {matchedCustomer.loyaltyPoints > 0 && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    max={matchedCustomer.loyaltyPoints}
                    min={0}
                    value={loyaltyPointsToRedeem}
                    onChange={(e) => setLoyaltyPointsToRedeem(Math.min(matchedCustomer.loyaltyPoints, Math.max(0, Number(e.target.value))))}
                    className="w-12 p-1 border border-neutral-300 rounded text-xs text-center font-bold"
                  />
                  <span className="text-[9px] font-black text-amber-700 uppercase">Redeem</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* GST Tax Calculations Summary */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-neutral-950 pb-2 border-b border-neutral-100 flex justify-between items-center">
            <span>Tax GST Invoice Breakdown</span>
            <span className="text-[10px] text-neutral-400 tracking-normal capitalize font-normal">Taxes calculated automatically</span>
          </h4>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-neutral-500">
              <span>Gross Total (MRP Tax Inclusive)</span>
              <span>₹{rawTotalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Total Taxable Base Value</span>
              <span>₹{subTotalTaxable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>GST (CGST + SGST total)</span>
              <span>₹{gstBreakdown.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>

            {/* Deductions and coupons */}
            <div className="pt-2 border-t border-dashed border-neutral-100 space-y-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="PROMO CODE"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full p-2 border border-neutral-200 rounded-lg text-xs"
                />
                <button 
                  onClick={applyPromoCoupon}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-black px-4 py-2 rounded-lg uppercase"
                >
                  Apply
                </button>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 font-bold text-[11px]">
                  <span>Applied Promo Coupon: {appliedCoupon.code}</span>
                  <span>- ₹{couponDeduction.toFixed(2)}</span>
                </div>
              )}

              {loyaltyPointsToRedeem > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold text-[11px]">
                  <span>Loyalty Points Redeemed ({loyaltyPointsToRedeem})</span>
                  <span>- ₹{loyaltyDeduction.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-neutral-500">
                <span>Manual Flat Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))}
                  className="w-20 p-1 border border-neutral-200 rounded text-right text-xs"
                />
              </div>

              <div className="flex justify-between items-center text-neutral-500">
                <span>Shipping Charges (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={shippingCharge}
                  onChange={(e) => setShippingCharge(Math.max(0, Number(e.target.value)))}
                  className="w-20 p-1 border border-neutral-200 rounded text-right text-xs"
                />
              </div>

              <div className="flex justify-between items-center text-neutral-500">
                <span>Packing Charges (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={packingCharge}
                  onChange={(e) => setPackingCharge(Math.max(0, Number(e.target.value)))}
                  className="w-20 p-1 border border-neutral-200 rounded text-right text-xs"
                />
              </div>

              <div className="flex justify-between text-neutral-500 text-[10px]">
                <span>Round Off Adjustment</span>
                <span>₹{roundOffValue.toFixed(2)}</span>
              </div>
            </div>

            {/* NET PAYABLE */}
            <div className="pt-3 border-t-2 border-neutral-950 flex justify-between items-center font-black text-base text-neutral-950">
              <span className="uppercase tracking-wide">Net Payable</span>
              <span>₹{netPayable.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Payment and Checkout Action */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-orange-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-950">Payment Settlement Mode</h4>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'Cash', label: 'Cash', icon: Receipt },
              { id: 'UPI', label: 'UPI QR', icon: Sparkles },
              { id: 'Split', label: 'Split Multi', icon: Landmark }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setPaymentMode(mode.id as any)}
                className={`py-2.5 px-2 rounded-xl border text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all ${
                  paymentMode === mode.id 
                    ? 'bg-neutral-950 border-neutral-950 text-white shadow-md' 
                    : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-600'
                }`}
              >
                <mode.icon className="w-4 h-4" />
                {mode.label}
              </button>
            ))}
          </div>

          {/* Split Multi Details Box */}
          {paymentMode === 'Split' && (
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3 animate-slideIn">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block">Configure split breakdown</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] font-black uppercase text-neutral-400 mb-1">Cash (₹)</label>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(Number(e.target.value))}
                    className="w-full p-2 border border-neutral-200 rounded text-xs text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase text-neutral-400 mb-1">UPI Pay (₹)</label>
                  <input
                    type="number"
                    value={upiAmount}
                    onChange={(e) => setUpiAmount(Number(e.target.value))}
                    className="w-full p-2 border border-neutral-200 rounded text-xs text-center font-bold"
                  />
                </div>
              </div>
              <div className="text-[9px] font-bold text-center mt-1">
                Total Allocated: <span className="text-neutral-900 font-black">₹{Number(cashAmount) + Number(upiAmount)}</span> / ₹{netPayable}
              </div>
            </div>
          )}

          {/* UPI Instant QR Code Display */}
          {paymentMode === 'UPI' && businessSettings.upiQrUrl && (
            <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100/60 flex flex-col items-center justify-center space-y-2 animate-fadeIn">
              <span className="text-[9px] font-black uppercase text-orange-700 tracking-wider">Dynamic QR Pay</span>
              <img src={businessSettings.upiQrUrl} className="w-24 h-24 object-contain bg-white p-1 rounded-lg border border-orange-200 shadow-xs" alt="UPI Scan QR" />
              <p className="text-[9px] text-neutral-500">Scan to pay instantly into Store Merchant Account</p>
            </div>
          )}

          {/* CHECKOUT ACTION */}
          <button
            onClick={handleBillCheckout}
            disabled={submitting || cart.length === 0}
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-neutral-300 text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl transition-all hover:translate-y-[-1px] active:translate-y-[1px] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                Generate GST Bill & Deduct Stock
              </>
            )}
          </button>
        </div>
      </div>

      {/* PRINTABLE GST A4 INVOICE PREVIEW MODAL */}
      {printedSale && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setPrintedSale(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 bg-neutral-100 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-between items-center pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wide">GST Tax Invoice Ready</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Printed A4 preview complies with Indian GST requirements.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print A4 Invoice
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([document.getElementById('printable-gst-invoice')?.innerHTML || ''], { type: 'text/html' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `Invoice_${printedSale.invoiceNumber}.html`;
                    link.click();
                  }}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-black text-xs uppercase px-4 py-2.5 rounded-xl flex items-center gap-1.5"
                >
                  Download HTML
                </button>
              </div>
            </div>

            {/* INVOICE VIEW CONTAINER (A4 SIZE IN MED PRINT) */}
            <div id="printable-gst-invoice" className="border border-neutral-300 p-8 rounded-lg bg-white text-black text-xs font-mono">
              <div className="text-center pb-6 border-b-2 border-neutral-950 space-y-1">
                <h1 className="text-xl font-black tracking-tight uppercase">{businessSettings.storeName}</h1>
                <p className="max-w-md mx-auto">{businessSettings.storeAddress}</p>
                <p>Phone: {businessSettings.storePhone} | Email: {businessSettings.storeEmail}</p>
                <p className="font-bold text-neutral-900 mt-1 uppercase">GSTIN: {businessSettings.storeGstin}</p>
                <div className="bg-neutral-950 text-white py-1 px-4 rounded-sm inline-block uppercase text-[10px] font-black tracking-widest mt-2">
                  Tax GST Invoice
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="grid grid-cols-2 gap-4 py-6 border-b border-neutral-200">
                <div className="space-y-1 text-left">
                  <p><span className="font-bold uppercase text-neutral-500">Invoice No:</span> <span className="font-black text-neutral-900">{printedSale.invoiceNumber}</span></p>
                  <p><span className="font-bold uppercase text-neutral-500">Date/Time:</span> {new Date(printedSale.createdAt).toLocaleString('en-IN')}</p>
                  <p><span className="font-bold uppercase text-neutral-500">Payment Settled:</span> <span className="font-bold uppercase">{printedSale.paymentMode}</span></p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="font-bold text-neutral-900">Billed To:</p>
                  <p>{printedSale.customerName}</p>
                  <p>Ph: {printedSale.customerPhone}</p>
                  {printedSale.customerAddress && <p>{printedSale.customerAddress}</p>}
                  {printedSale.customerGst && <p className="font-bold uppercase">Customer GSTIN: {printedSale.customerGst}</p>}
                </div>
              </div>

              {/* Product Table */}
              <table className="w-full text-left my-6 border-collapse">
                <thead>
                  <tr className="border-b-2 border-neutral-950 font-bold uppercase text-neutral-600 text-[10px]">
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-center">HSN</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">MRP</th>
                    <th className="py-2 text-center">GST %</th>
                    <th className="py-2 text-right">CGST</th>
                    <th className="py-2 text-right">SGST</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {printedSale.items.map((item, index) => (
                    <tr key={index} className="text-[11px]">
                      <td className="py-3 font-bold text-neutral-900">
                        {item.productName}
                        <span className="block text-[9px] font-normal text-neutral-400">SKU: {item.sku}</span>
                      </td>
                      <td className="py-3 text-center">{item.hsnCode}</td>
                      <td className="py-3 text-center">{item.quantity}</td>
                      <td className="py-3 text-right">₹{item.mrp}</td>
                      <td className="py-3 text-center">{item.gstPercent}%</td>
                      <td className="py-3 text-right">₹{(item.cgst * item.quantity).toFixed(2)}</td>
                      <td className="py-3 text-right">₹{(item.sgst * item.quantity).toFixed(2)}</td>
                      <td className="py-3 text-right font-bold text-neutral-900">₹{item.totalAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary Calculations */}
              <div className="border-t-2 border-neutral-950 pt-4 flex justify-between items-start">
                <div className="w-1/2 space-y-1 text-left text-[10px] text-neutral-500">
                  <p className="font-bold text-neutral-900">Declarations & Return Policy:</p>
                  <p>1. Goods once sold cannot be returned but can be exchanged within 7 days in pristine condition.</p>
                  <p>2. We declare that this invoice shows the actual price of the fashion garments described.</p>
                  <div className="pt-4 flex items-center gap-3">
                    {businessSettings.upiQrUrl && (
                      <div className="border p-1 bg-white inline-block">
                        <img src={businessSettings.upiQrUrl} className="w-16 h-16 object-contain" alt="Invoice Payment QR" />
                      </div>
                    )}
                    <p className="max-w-[160px] leading-tight">Scan with any BHIM UPI App to complete digital payment balance.</p>
                  </div>
                </div>

                <div className="w-2/5 space-y-2 text-right">
                  <div className="flex justify-between text-neutral-600 text-[11px]">
                    <span>Subtotal (Taxable):</span>
                    <span>₹{printedSale.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600 text-[11px]">
                    <span>IGST:</span>
                    <span>₹0.00</span>
                  </div>
                  <div className="flex justify-between text-neutral-600 text-[11px]">
                    <span>CGST (Central Tax):</span>
                    <span>₹{(printedSale.taxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600 text-[11px]">
                    <span>SGST (State Tax):</span>
                    <span>₹{(printedSale.taxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {printedSale.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 text-[11px] font-bold">
                      <span>Loyalty / Discounts:</span>
                      <span>- ₹{printedSale.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {printedSale.shippingCharge ? (
                    <div className="flex justify-between text-neutral-600 text-[11px]">
                      <span>Shipping Charge:</span>
                      <span>₹{printedSale.shippingCharge.toFixed(2)}</span>
                    </div>
                  ) : null}
                  {printedSale.packingCharge ? (
                    <div className="flex justify-between text-neutral-600 text-[11px]">
                      <span>Packing Charge:</span>
                      <span>₹{printedSale.packingCharge.toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-neutral-400 text-[10px]">
                    <span>Round Off:</span>
                    <span>₹{printedSale.roundOff.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-950 font-black text-sm pt-2 border-t border-neutral-200">
                    <span className="uppercase text-xs tracking-wider">Grand Total:</span>
                    <span>₹{printedSale.grandTotal.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="pt-8 text-center">
                    <div className="h-12 border-b border-neutral-300 w-32 ml-auto mb-1"></div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-widest">Authorized Signatory</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-8 border-t border-neutral-200 mt-8 text-neutral-400 text-[10px]">
                Thank you for shopping at Rightnow Garments! Visit again.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
