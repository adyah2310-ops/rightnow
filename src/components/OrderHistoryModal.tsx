import React from 'react';
import { X, CheckCircle, Package, Truck, Smile, AlertCircle, ShoppingBag } from 'lucide-react';
import { Order } from '../types';

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
}

export default function OrderHistoryModal({ isOpen, onClose, orders }: OrderHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div id="history-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        id="history-modal-container"
        className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800 flex flex-col max-h-[85vh] transition-all transform duration-300 relative"
      >
        {/* Top styling strip */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-neutral-950 to-orange-500 w-full shrink-0"></div>

        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors p-1 bg-neutral-100 dark:bg-neutral-850 rounded-full z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 text-left shrink-0 bg-neutral-50 dark:bg-neutral-950">
          <h2 className="text-xl font-black text-neutral-950 dark:text-white uppercase tracking-tight">Your Order History & Tracking</h2>
          <p className="text-xs text-neutral-400 mt-1">Trace your payment verifications and courier dispatches.</p>
        </div>

        {/* Scrollable contents */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {orders.length === 0 ? (
            <div id="empty-history-view" className="text-center py-16 space-y-4">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <p className="font-extrabold text-neutral-800 dark:text-neutral-200 text-sm">No recent orders found</p>
                <p className="text-xs text-neutral-400 mt-1">You haven't placed any purchases under this account yet.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                // Determine timeline indices
                const statusIndexMap = {
                  'Payment Verification Pending': 0,
                  'Confirmed': 1,
                  'Packed': 2,
                  'Shipped': 3,
                  'Delivered': 4,
                  'Cancelled': -1,
                };
                const currentStep = statusIndexMap[order.status];

                const timelineSteps = [
                  { label: 'Verify', desc: 'Scan Screenshot', icon: CheckCircle },
                  { label: 'Confirmed', desc: 'Payment Approved', icon: CheckCircle },
                  { label: 'Packed', desc: 'Garments Prepared', icon: Package },
                  { label: 'Shipped', desc: 'On Transit Road', icon: Truck },
                  { label: 'Delivered', desc: 'Handed Over', icon: Smile },
                ];

                return (
                  <div 
                    key={order.id} 
                    id={`history-item-${order.orderNumber}`}
                    className="p-5 bg-neutral-50 dark:bg-neutral-950/60 rounded-2xl border border-neutral-200/60 dark:border-neutral-800 text-left space-y-5 shadow-3xs"
                  >
                    {/* Top Brief */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-neutral-200/60 pb-3">
                      <div>
                        <span className="text-[10px] font-black text-orange-500 uppercase block">Order Reference No.</span>
                        <h4 className="font-black text-sm text-neutral-950 dark:text-white">{order.orderNumber}</h4>
                        <span className="text-[10px] text-neutral-400 block mt-0.5">Placed: {new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs font-black text-neutral-900 dark:text-white block">Total Total: ₹{order.totalAmount.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-neutral-400 block">Contains {order.items.reduce((sum, item) => sum + item.quantity, 0)} garments</span>
                      </div>
                    </div>

                    {/* Order items summary list */}
                    <div className="flex gap-2.5 overflow-x-auto py-1 scrollbar-none">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 bg-white dark:bg-neutral-900 p-2 border border-neutral-100 dark:border-neutral-800 rounded-xl shrink-0">
                          <img src={item.image} className="w-8 h-10 object-cover rounded" />
                          <div className="text-xs leading-tight">
                            <p className="font-bold text-neutral-800 dark:text-neutral-200 line-clamp-1 max-w-[120px]">{item.productName}</p>
                            <p className="text-[9px] text-neutral-400 uppercase font-extrabold">Size {item.selectedSize} • x{item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Timeline Tracker Progress Bar */}
                    {order.status === 'Cancelled' ? (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 p-3 rounded-xl flex items-center gap-2.5 text-xs text-red-700 dark:text-red-400 font-extrabold uppercase">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        This order has been Cancelled by merchant/client.
                      </div>
                    ) : (
                      <div className="pt-2 space-y-4">
                        <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider block">Live Delivery Status Timeline</span>
                        
                        <div className="relative flex justify-between items-start w-full">
                          {/* Horizontal connecting line */}
                          <div className="absolute top-4 left-6 right-6 h-0.5 bg-neutral-200 dark:bg-neutral-850 -z-1">
                            <div 
                              style={{ width: `${currentStep >= 0 ? (currentStep / 4) * 100 : 0}%` }}
                              className="h-full bg-orange-500 transition-all duration-1000"
                            ></div>
                          </div>

                          {timelineSteps.map((step, idx) => {
                            const isCompleted = currentStep >= idx;
                            const isActive = currentStep === idx;
                            const StepIcon = step.icon;

                            return (
                              <div key={idx} className="flex flex-col items-center text-center space-y-1.5 w-16 z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                  isActive ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-100 scale-110' :
                                  isCompleted ? 'border-orange-500 bg-orange-500 text-white' :
                                  'border-neutral-200 dark:border-neutral-850 bg-white dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600'
                                }`}>
                                  <StepIcon className="w-4 h-4" />
                                </div>
                                
                                <div className="leading-tight">
                                  <p className={`text-[9px] font-black uppercase tracking-tight ${
                                    isActive ? 'text-orange-600' :
                                    isCompleted ? 'text-neutral-800 dark:text-neutral-200 font-extrabold' : 'text-neutral-400 font-bold'
                                  }`}>{step.label}</p>
                                  <p className="text-[8px] text-neutral-400 hidden sm:block">{step.desc}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
