import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, ShieldCheck, QrCode, UploadCloud, CheckCircle, Sparkles, AlertCircle, Loader2, Clock } from 'lucide-react';
import { CartItem, Coupon, Order } from '../types';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface CheckoutFormProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  appliedCoupon: Coupon | null;
  discountAmount: number;
  userEmail: string;
  onOrderSuccess: (order: Order) => void;
  onClearCart: () => void;
  deliverySettings?: {
    expressEnabled: boolean;
    expressCharge: number;
    normalCharge: number;
    freeDeliveryThreshold: number;
    eligibleLocations: string[];
  };
}

export default function CheckoutForm({
  isOpen,
  onClose,
  cartItems,
  appliedCoupon,
  discountAmount,
  userEmail,
  onOrderSuccess,
  onClearCart,
  deliverySettings,
}: CheckoutFormProps) {
  // Form states
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState(userEmail || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Tiruchirappalli');
  const [state, setState] = useState('Tamil Nadu');
  const [pinCode, setPinCode] = useState('');
  const [notes, setNotes] = useState('');
  
  // Delivery speed selection state
  const [deliveryMode, setDeliveryMode] = useState<'NORMAL' | 'EXPRESS'>('NORMAL');

  // Screenshot upload state
  const [screenshotBase64, setScreenshotBase64] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Active delivery config (either passed as prop or falling back to safe local defaults)
  const config = deliverySettings || {
    expressEnabled: true,
    expressCharge: 150,
    normalCharge: 40,
    freeDeliveryThreshold: 499,
    eligibleLocations: ['Tiruchirappalli', 'Tennur', 'Srirangam', 'Cantonment', 'Thillai Nagar', 'Trichy', 'Kattur']
  };

  const isExpressEligible = config.eligibleLocations.some(
    loc => city.toLowerCase().includes(loc.toLowerCase()) || address.toLowerCase().includes(loc.toLowerCase())
  );

  // Revert back to NORMAL if location eligibility becomes false
  useEffect(() => {
    if (!isExpressEligible && deliveryMode === 'EXPRESS') {
      setDeliveryMode('NORMAL');
    }
  }, [isExpressEligible, deliveryMode]);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.offerPrice * item.quantity, 0);
  
  // Determine Delivery Charge
  let deliveryCharge = 0;
  if (deliveryMode === 'EXPRESS') {
    deliveryCharge = config.expressCharge;
  } else {
    deliveryCharge = subtotal >= config.freeDeliveryThreshold ? 0 : config.normalCharge;
  }

  const totalAmount = Math.max(0, subtotal - discountAmount + deliveryCharge);

  // Helper to format Est. Normal delivery date
  const getEstimatedNormalDate = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', weekday: 'short' };
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 3);
    return estDate.toLocaleDateString('en-IN', options);
  };

  // Generate unique order reference number
  const orderNumber = `RN-${Math.floor(100000 + Math.random() * 900000)}`;

  // Fixed Merchant UPI Link & QR Code
  const ownerUpiId = "9994780828@okaxis"; // derived from phone
  const upiPayLink = `upi://pay?pa=${ownerUpiId}&pn=Rightnow%20Garments`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiPayLink)}`;

  // File Upload Handler (Base64 converter)
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) { // limit 3MB
      setUploadError('File size is too large. Please upload an image under 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.onerror = () => {
      setUploadError('Failed to read file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);

    if (!screenshotBase64) {
      setFormError('Please upload a screenshot of your successful UPI payment to continue.');
      setLoading(false);
      return;
    }

    try {
      const orderData: Omit<Order, 'id'> = {
        orderNumber,
        customerId: userEmail || 'Guest_User',
        customerName: fullName,
        customerEmail: email || userEmail || 'guest@rightnow.com',
        customerPhone: mobileNumber,
        shippingAddress: {
          fullName,
          mobileNumber,
          email,
          address,
          city,
          state,
          pinCode,
          notes,
        },
        items: cartItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          brand: item.product.brand,
          quantity: item.quantity,
          price: item.product.offerPrice,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          image: item.product.images[0],
        })),
        totalAmount,
        discountAmount,
        couponCode: appliedCoupon?.code || '',
        deliveryMethod: deliveryMode === 'EXPRESS' ? 'Express Delivery' : 'Normal Delivery',
        deliveryCharge,
        paymentScreenshot: screenshotBase64,
        status: 'Payment Verification Pending',
        createdAt: new Date().toISOString(),
      };

      // Add to Firestore database
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      const placedOrder: Order = {
        id: docRef.id,
        ...orderData,
      };

      // Successfully saved
      setLoading(false);
      onOrderSuccess(placedOrder);
      onClearCart();
      onClose();
    } catch (err: any) {
      console.error('Error placing order:', err);
      setFormError('Failed to place order in Database. Try again or check your network connection.');
      setLoading(false);
    }
  };

  return (
    <div id="checkout-modal-overlay" className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4">
      <div 
        id="checkout-modal-container"
        className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 w-full max-w-4xl h-full md:h-auto md:max-h-[92vh] md:rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 border border-transparent dark:border-neutral-800"
      >
        {/* Banner */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-neutral-950 to-orange-500 shrink-0"></div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0 bg-neutral-50 dark:bg-neutral-950">
          <button 
            id="checkout-back-btn"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-black uppercase text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </button>
          <span className="text-sm font-black uppercase text-neutral-900 dark:text-white tracking-wider">
            Secure Checkout Portal
          </span>
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors p-1 bg-neutral-100 dark:bg-neutral-850 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Checkout content split in columns */}
        <form onSubmit={handleSubmitOrder} className="flex-grow overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* COLUMN 1: Billing & Shipping Address Details (7 cols) */}
          <div className="md:col-span-7 space-y-6">
            <div>
              <h2 className="text-lg font-black tracking-tight text-neutral-900 dark:text-white">Shipping & Delivery Details</h2>
              <p className="text-xs text-neutral-400">Please provide accurate contact details for verified shipping.</p>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-xs rounded-r-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Full Name *</label>
                <input
                  id="checkout-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sibi Pandian"
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Mobile Number *</label>
                <input
                  id="checkout-phone"
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. +91 99947 XXXXX"
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Email Address (For Notifications)</label>
                <input
                  id="checkout-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sibi@gmail.com"
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Detailed Delivery Address *</label>
                <textarea
                  id="checkout-address"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Landmark, Apartment, Area..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">City / District *</label>
                <input
                  id="checkout-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">State *</label>
                <input
                  id="checkout-state"
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">PIN Code *</label>
                <input
                  id="checkout-pin"
                  type="text"
                  required
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="e.g. 620018"
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Order Notes (Optional)</label>
                <input
                  id="checkout-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Leave with neighbor"
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            {/* Delivery Method Selection */}
            <div className="space-y-3 pt-2">
              <label className="block text-[10px] font-black uppercase text-neutral-400 tracking-widest">
                Choose Delivery Speed
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Normal Delivery Card */}
                <div 
                  onClick={() => setDeliveryMode('NORMAL')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-2 text-left ${
                    deliveryMode === 'NORMAL'
                      ? 'border-neutral-950 dark:border-white bg-neutral-50 dark:bg-neutral-950/40'
                      : 'border-neutral-100 dark:border-neutral-800 bg-transparent hover:border-neutral-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-tight">Normal Delivery</span>
                    <span className="text-xs font-black text-neutral-900 dark:text-white">
                      {subtotal >= config.freeDeliveryThreshold ? 'FREE' : `₹${config.normalCharge}`}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-neutral-400">Arrives in 3–4 Days</p>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Est. Delivery: {getEstimatedNormalDate()}
                    </p>
                  </div>
                </div>

                {/* Express Delivery Card */}
                <div 
                  onClick={() => {
                    if (config.expressEnabled && isExpressEligible) {
                      setDeliveryMode('EXPRESS');
                    }
                  }}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between space-y-2 text-left relative ${
                    !config.expressEnabled || !isExpressEligible
                      ? 'opacity-45 cursor-not-allowed border-neutral-100 dark:border-neutral-800 bg-neutral-100/10'
                      : deliveryMode === 'EXPRESS'
                        ? 'border-neutral-950 dark:border-white bg-neutral-50 dark:bg-neutral-950/40 cursor-pointer'
                        : 'border-neutral-100 dark:border-neutral-800 bg-transparent hover:border-neutral-200 cursor-pointer'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-tight flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-orange-500 animate-pulse shrink-0" />
                      Express Delivery
                    </span>
                    <span className="text-xs font-black text-orange-500">₹{config.expressCharge}</span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-neutral-400">Delivery Within Minutes (Local)</p>
                    {config.expressEnabled && isExpressEligible ? (
                      <p className="text-[10px] font-bold text-orange-500">
                        Est. Time: 35–45 Mins
                      </p>
                    ) : !config.expressEnabled ? (
                      <p className="text-[9px] font-bold text-red-500 uppercase tracking-tight">Temporarily Disabled</p>
                    ) : (
                      <p className="text-[9px] text-red-500 font-bold uppercase tracking-tight">Not eligible for address</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Ineligibility tip */}
              {config.expressEnabled && !isExpressEligible && (
                <p className="text-[9px] text-neutral-400 leading-tight">
                  ℹ️ Express delivery is only available for local orders in: <span className="font-bold text-neutral-500">{config.eligibleLocations.join(', ')}</span>. Modify your City or Address to qualify.
                </p>
              )}
            </div>

            {/* Selected items receipt preview */}
            <div className="bg-neutral-50 dark:bg-neutral-950/40 p-4 rounded-xl border border-neutral-100 dark:border-neutral-850">
              <span className="text-[10px] font-black uppercase text-neutral-400 block mb-2">Itemized Invoice Receipt</span>
              <div className="max-h-24 overflow-y-auto space-y-1.5 scrollbar-none pr-1">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-350 truncate max-w-[250px]">
                      {item.product.name} (x{item.quantity})
                    </span>
                    <span className="font-extrabold text-neutral-800 dark:text-neutral-200">
                      ₹{(item.product.offerPrice * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-800 mt-2.5 pt-2.5 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-450">
                <div className="flex justify-between">
                  <span>Cart Items Subtotal</span>
                  <span className="font-extrabold text-neutral-800 dark:text-neutral-200">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span className="font-bold">-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>
                    Delivery Fee ({deliveryMode === 'EXPRESS' ? 'Express Speed' : 'Normal Speed'})
                  </span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                  </span>
                </div>
                <div className="flex justify-between font-black text-sm text-neutral-900 dark:text-white pt-1.5 border-t border-neutral-100 dark:border-neutral-850">
                  <span>Grand Total</span>
                  <span className="text-orange-500">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: QR Payment Gate & Screenshot Uploader (5 cols) */}
          <div className="md:col-span-5 bg-neutral-950 text-white p-6 rounded-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Instant UPI QR Portal</h3>
              </div>

              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Scan this fixed merchant QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) to complete your payment of <strong className="text-orange-500 text-xs">₹{totalAmount.toLocaleString('en-IN')}</strong> directly to the owner.
              </p>

              {/* QR Image Center */}
              <div className="bg-white p-3 rounded-xl inline-block mx-auto relative group shadow-lg">
                <img 
                  id="checkout-upi-qr"
                  src={qrCodeUrl} 
                  alt="UPI Payment QR Code" 
                  className="w-40 h-40 object-contain mx-auto"
                />
                <span className="text-[9px] text-neutral-500 font-bold block text-center mt-1 uppercase tracking-tight">
                  Rightnow Garments Merchant QR
                </span>
              </div>

              {/* UPI and Phone credentials */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Merchant Name:</span>
                  <span className="font-bold text-neutral-200">Rightnow Garments</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Owner UPI ID:</span>
                  <span className="font-bold text-orange-500 select-all">{ownerUpiId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Mobile No:</span>
                  <span className="font-bold text-neutral-200">+91 99947 80828</span>
                </div>
              </div>
            </div>

            {/* SCREENSHOT UPLOADER PANEL */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider block">
                Verification Proof (Screenshot) *
              </span>

              {screenshotBase64 ? (
                <div className="relative border-2 border-dashed border-emerald-500 rounded-xl p-2.5 bg-neutral-900/60 flex items-center gap-3">
                  <img 
                    src={screenshotBase64} 
                    alt="Uploaded payment proof" 
                    className="w-12 h-16 object-cover rounded border border-neutral-800"
                  />
                  <div className="flex-grow text-left">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Proof Attached
                    </span>
                    <span className="text-[10px] text-neutral-400 block truncate max-w-[150px]">Ready for order submission</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScreenshotBase64('')}
                    className="text-neutral-400 hover:text-red-500 text-xs font-bold"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div className="relative border-2 border-dashed border-neutral-800 hover:border-orange-500 transition-colors rounded-xl p-4 text-center cursor-pointer bg-neutral-900/40">
                  <input
                    id="screenshot-file-input"
                    type="file"
                    accept="image/*"
                    required
                    onChange={handleScreenshotChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <UploadCloud className="w-6 h-6 text-neutral-500 mx-auto mb-1" />
                  <span className="text-[10px] font-bold text-neutral-300 block uppercase">
                    Upload Payment Screenshot
                  </span>
                  <span className="text-[9px] text-neutral-500 block">JPEG, PNG under 3MB</span>
                </div>
              )}

              {uploadError && (
                <p className="text-[10px] font-bold text-red-400 pl-1">{uploadError}</p>
              )}
            </div>

            {/* CTA Final checkout placement */}
            <div className="pt-2 border-t border-neutral-900">
              <button
                id="submit-order-button"
                type="submit"
                disabled={loading || !screenshotBase64}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:pointer-events-none text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Confirm Payment & Place Order
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
