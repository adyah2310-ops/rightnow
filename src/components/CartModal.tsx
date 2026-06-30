import React, { useState } from 'react';
import { X, ShoppingBag, Trash2, ArrowRight, Tag, Percent, Sparkles, ShieldCheck } from 'lucide-react';
import { CartItem, Coupon } from '../types';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  onRemoveItem: (productId: string, size: string, color: string) => void;
  onProceedToCheckout: (appliedCoupon: Coupon | null, discountVal: number) => void;
  availableCoupons: Coupon[];
}

export default function CartModal({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  availableCoupons,
}: CartModalProps) {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');

  if (!isOpen) return null;

  // Calculate Subtotal
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.offerPrice * item.quantity, 0);

  // Apply coupons calculations
  let discountAmount = 0;
  if (appliedCoupon) {
    if (subtotal >= appliedCoupon.minPurchase) {
      if (appliedCoupon.discountType === 'percentage') {
        discountAmount = Math.round((subtotal * appliedCoupon.value) / 100);
      } else {
        discountAmount = appliedCoupon.value;
      }
    } else {
      // If purchase drops below minimum purchase after quantity update, auto-remove coupon
      setAppliedCoupon(null);
    }
  }

  const totalAmount = Math.max(0, subtotal - discountAmount);

  const handleApplyCoupon = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCouponError('');

    const trimmedCode = couponCode.trim().toUpperCase();
    const foundCoupon = availableCoupons.find((c) => c.code === trimmedCode && c.isActive);

    if (!foundCoupon) {
      setCouponError('Invalid coupon code or expired.');
      return;
    }

    if (subtotal < foundCoupon.minPurchase) {
      setCouponError(`Minimum purchase of ₹${foundCoupon.minPurchase} is required for this coupon.`);
      return;
    }

    setAppliedCoupon(foundCoupon);
    setCouponCode('');
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  return (
    <div id="cart-drawer-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end">
      {/* Drawer content panel */}
      <div 
        id="cart-drawer-panel"
        className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 w-full max-w-md h-full shadow-2xl flex flex-col animate-slideLeft border-l border-neutral-100 dark:border-neutral-800"
      >
        {/* Top Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            <h2 className="font-black text-base uppercase tracking-tight text-neutral-950 dark:text-white">
              Your Garment Cart ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})
            </h2>
          </div>
          <button 
            id="cart-close-btn"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors p-1 bg-neutral-200 dark:bg-neutral-800 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable list of items */}
        <div className="flex-grow overflow-y-auto p-5 space-y-4">
          {cartItems.length === 0 ? (
            <div id="empty-cart-view" className="text-center py-16 space-y-4">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <p className="font-extrabold text-neutral-800 dark:text-neutral-200 text-sm">Your cart is currently empty</p>
                <p className="text-xs text-neutral-400 mt-1">Add items from the store to begin styling!</p>
              </div>
              <button
                id="cart-empty-shop-now"
                onClick={onClose}
                className="bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-white font-black text-xs uppercase px-5 py-2.5 rounded-lg transition-colors"
              >
                Start Browsing
              </button>
            </div>
          ) : (
            cartItems.map((item, idx) => {
              const itemTotal = item.product.offerPrice * item.quantity;
              return (
                <div 
                  key={idx}
                  id={`cart-item-${item.product.id}-${item.selectedSize}`}
                  className="p-3.5 bg-neutral-50 hover:bg-white dark:bg-neutral-950 dark:hover:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-850 rounded-xl flex gap-3.5 transition-all relative group"
                >
                  {/* Thumbnail */}
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-16 h-20 object-cover rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shrink-0"
                  />

                  {/* Info details */}
                  <div className="flex-grow min-w-0 space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 block">{item.product.brand}</span>
                    <h4 className="font-bold text-xs text-neutral-950 dark:text-white line-clamp-1 leading-snug">{item.product.name}</h4>
                    
                    {/* Size and color tags */}
                    <div className="flex gap-1.5 pt-0.5">
                      <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-1.5 py-0.5 rounded-xs">
                        Size: {item.selectedSize}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-1.5 py-0.5 rounded-xs">
                        Color: {item.selectedColor}
                      </span>
                    </div>

                    {/* Quantity controls & Price */}
                    <div className="flex items-center justify-between pt-2.5">
                      <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-900">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, item.selectedColor, item.quantity - 1)}
                          className="px-2.5 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors font-black text-xs"
                        >
                          -
                        </button>
                        <span className="px-3 py-0.5 text-xs font-bold text-neutral-900 dark:text-white">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.selectedSize, item.selectedColor, item.quantity + 1)}
                          className="px-2.5 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors font-black text-xs"
                        >
                          +
                        </button>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs font-black text-neutral-900 dark:text-white block">₹{itemTotal.toLocaleString('en-IN')}</span>
                        {item.quantity > 1 && (
                          <span className="text-[10px] text-neutral-400 block">₹{item.product.offerPrice} each</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    id={`cart-remove-btn-${item.product.id}-${item.selectedSize}`}
                    onClick={() => onRemoveItem(item.product.id, item.selectedSize, item.selectedColor)}
                    className="absolute top-2.5 right-2.5 text-neutral-400 hover:text-red-500 p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors opacity-0 group-hover:opacity-100 duration-200"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom checkout, coupons, summary panel */}
        {cartItems.length > 0 && (
          <div className="border-t border-neutral-100 dark:border-neutral-800 p-5 space-y-4 bg-neutral-50 dark:bg-neutral-950 shrink-0">
            {/* Coupon system interface */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3 text-orange-500" />
                Apply Discount Coupon
              </label>

              {appliedCoupon ? (
                <div id="active-coupon-badge" className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-emerald-500 text-white rounded-md">
                      <Percent className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase block">{appliedCoupon.code}</span>
                      <span className="text-[10px] text-emerald-600 block">{appliedCoupon.description}</span>
                    </div>
                  </div>
                  <button 
                    onClick={removeCoupon}
                    className="text-xs text-red-500 font-bold hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    id="coupon-input-field"
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="e.g. FIRST10, RIGHTNOW200"
                    className="flex-grow px-3 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs uppercase focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                  <button
                    id="apply-coupon-btn"
                    type="submit"
                    className="bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 text-white font-bold text-xs px-4 rounded-lg transition-colors shrink-0"
                  >
                    Apply
                  </button>
                </form>
              )}

              {couponError && (
                <p id="coupon-error-msg" className="text-[10px] font-semibold text-red-600 pl-1">{couponError}</p>
              )}

              {/* Display available coupons to trigger fast discovery */}
              {!appliedCoupon && (
                <div className="pt-1 flex gap-1.5 overflow-x-auto scrollbar-none py-1">
                  {availableCoupons.map((coupon) => (
                    <button
                      key={coupon.code}
                      onClick={() => {
                        setCouponCode(coupon.code);
                        setCouponError('');
                      }}
                      className="text-[9px] font-extrabold text-neutral-600 dark:text-neutral-300 hover:text-orange-600 border border-neutral-200 dark:border-neutral-800 hover:border-orange-500 rounded px-2 py-1 bg-white dark:bg-neutral-900 shrink-0 shadow-3xs"
                    >
                      {coupon.code}
                    </button>
                  ))}
                </div>
              )}
            </div>

             {/* Calculations Breakdown */}
            <div className="border-t border-neutral-200/60 dark:border-neutral-800 pt-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Subtotal</span>
                <span className="font-extrabold text-neutral-800 dark:text-neutral-200">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="font-semibold">Applied Discount ({appliedCoupon.code})</span>
                  <span className="font-black">-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Shipping</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase">Free Delivery</span>
              </div>

              <div className="flex justify-between text-base border-t border-neutral-200/60 dark:border-neutral-800 pt-3">
                <span className="font-black text-neutral-900 dark:text-white">Total Amount</span>
                <span id="cart-total-value" className="font-black text-neutral-950 dark:text-white">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Security Note */}
            <p className="text-[10px] text-neutral-400 flex items-center gap-1 justify-center py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              100% Genuine Branded Garments from Tiruchirappalli
            </p>

            {/* Proceed Button */}
            <button
              id="cart-checkout-btn"
              onClick={() => onProceedToCheckout(appliedCoupon, discountAmount)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-98"
            >
              Proceed To Verification Checkout
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
