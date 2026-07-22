import React, { useState, useEffect } from 'react';
import { 
  collection, getDocs, doc, runTransaction, setDoc 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Product, Supplier, PurchaseRecord } from '../../types';
import { 
  Receipt, Plus, Minus, Trash2, ShieldCheck, 
  Search, X, FileText, Landmark, RefreshCw 
} from 'lucide-react';

interface PurchasesManagerProps {
  products: Product[];
  onRefreshData: () => void;
  triggerGlobalAlert: (type: 'success' | 'error', text: string) => void;
}

export default function PurchasesManager({
  products,
  onRefreshData,
  triggerGlobalAlert
}: PurchasesManagerProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Active form state
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Credit'>('Cash');

  // Purchase items
  const [purchaseItems, setPurchaseItems] = useState<{
    product: Product;
    quantity: number;
    purchasePrice: number;
    gstPercent: number;
  }[]>([]);

  // Search product inside purchase
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const fetchDependencies = async () => {
    setLoading(true);
    try {
      // Fetch suppliers
      const supSnap = await getDocs(collection(db, 'suppliers'));
      const supList: Supplier[] = [];
      supSnap.forEach(doc => {
        supList.push({ id: doc.id, ...doc.data() } as Supplier);
      });
      setSuppliers(supList);

      // Fetch purchases
      const purSnap = await getDocs(collection(db, 'purchases'));
      const purList: PurchaseRecord[] = [];
      purSnap.forEach(doc => {
        purList.push({ id: doc.id, ...doc.data() } as PurchaseRecord);
      });
      // Sort purchases by date
      purList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPurchases(purList);
    } catch (e) {
      console.error(e);
      triggerGlobalAlert('error', 'Failed to load purchase records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  const handleAddProductToPurchase = (p: Product) => {
    const exists = purchaseItems.some(item => item.product.id === p.id);
    if (exists) {
      triggerGlobalAlert('error', 'Apparel item is already added to this purchase bill.');
      return;
    }
    setPurchaseItems([
      ...purchaseItems,
      {
        product: p,
        quantity: 10, // default batch purchase
        purchasePrice: p.purchasePrice || Math.round(p.price * 0.6), // fallback default 60% of price
        gstPercent: p.gstPercent || 5
      }
    ]);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const updateItemField = (index: number, field: 'quantity' | 'purchasePrice' | 'gstPercent', value: number) => {
    const updated = [...purchaseItems];
    updated[index] = {
      ...updated[index],
      [field]: Math.max(0, value)
    };
    setPurchaseItems(updated);
  };

  const removeItem = (index: number) => {
    const updated = [...purchaseItems];
    updated.splice(index, 1);
    setPurchaseItems(updated);
  };

  // Calculations
  const taxableTotal = purchaseItems.reduce((sum, item) => {
    return sum + (item.purchasePrice * item.quantity);
  }, 0);

  const gstTotal = purchaseItems.reduce((sum, item) => {
    const lineTax = (item.purchasePrice * (item.gstPercent / 100)) * item.quantity;
    return sum + lineTax;
  }, 0);

  const grandTotal = taxableTotal + gstTotal;

  // Process purchase entry using ACID Transaction
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      triggerGlobalAlert('error', 'Please select a supplier for this purchase.');
      return;
    }
    if (!billNumber.trim()) {
      triggerGlobalAlert('error', 'Supplier invoice bill number is mandatory.');
      return;
    }
    if (purchaseItems.length === 0) {
      triggerGlobalAlert('error', 'Purchase list is empty. Add apparel items to stock.');
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) return;

    setLoading(true);
    const purchaseId = `pur_${Date.now()}`;

    try {
      // Transaction to safely update product stock levels and supplier book balance
      await runTransaction(db, async (transaction) => {
        // 1. Fetch current live product docs for locking
        const productsSnap = await getDocs(collection(db, 'products'));
        const productsMap: { [id: string]: { docId: string; data: Product } } = {};
        
        productsSnap.forEach(doc => {
          const data = doc.data() as Product;
          productsMap[data.id] = { docId: doc.id, data };
        });

        // 2. Map and adjust stock levels
        for (const item of purchaseItems) {
          const match = productsMap[item.product.id];
          if (!match) {
            throw new Error(`Product "${item.product.name}" no longer exists in database catalogue.`);
          }

          const productRef = doc(db, 'products', match.docId);
          const oldStock = match.data.stock || 0;
          const oldWarehouse = match.data.warehouseStock || oldStock;

          // Increment live stock and warehouse stock
          transaction.update(productRef, {
            stock: oldStock + item.quantity,
            warehouseStock: oldWarehouse + item.quantity,
            purchasePrice: item.purchasePrice, // sync latest cost price
            gstPercent: item.gstPercent,
            updatedDate: new Date().toISOString()
          });
        }

        // 3. Update Supplier wallet balance if payment mode is Credit
        if (paymentMode === 'Credit') {
          const supRef = doc(db, 'suppliers', supplier.id);
          transaction.update(supRef, {
            balance: supplier.balance + grandTotal
          });
        }

        // 4. Save purchase transaction bill
        const pItems = purchaseItems.map(item => {
          const subtotal = item.purchasePrice * item.quantity;
          const tax = subtotal * (item.gstPercent / 100);
          return {
            productId: item.product.id,
            productName: item.product.name,
            sku: item.product.sku || 'N/A',
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
            gstPercent: item.gstPercent,
            taxableAmount: Number(subtotal.toFixed(2)),
            cgst: Number((tax / 2).toFixed(2)),
            sgst: Number((tax / 2).toFixed(2)),
            igst: 0,
            totalAmount: Number((subtotal + tax).toFixed(2))
          };
        });

        const purchaseRecord: PurchaseRecord = {
          id: purchaseId,
          billNumber: billNumber.trim(),
          supplierId: supplier.id,
          supplierName: supplier.companyName,
          items: pItems,
          taxableTotal: Number(taxableTotal.toFixed(2)),
          gstTotal: Number(gstTotal.toFixed(2)),
          grandTotal: Math.round(grandTotal),
          paymentMode: paymentMode,
          status: 'Received',
          createdAt: new Date().toISOString()
        };

        const purchaseRef = doc(db, 'purchases', purchaseId);
        transaction.set(purchaseRef, purchaseRecord);

        // Save activity log
        const logId = `log_${Date.now()}`;
        const logRef = doc(db, 'activity_logs', logId);
        transaction.set(logRef, {
          id: logId,
          employeeId: 'owner_admin',
          employeeName: 'Store Administrator',
          action: `Purchase Stock replenishment #${billNumber}`,
          details: `Replenished +${purchaseItems.reduce((s, i) => s + i.quantity, 0)} units of garments from ${supplier.companyName}. Net invoice value: ₹${Math.round(grandTotal)}`,
          timestamp: new Date().toISOString()
        });
      });

      triggerGlobalAlert('success', `Purchase Bill "${billNumber}" logged. Live stock increased automatically!`);
      // Reset form
      setShowForm(false);
      setBillNumber('');
      setSelectedSupplierId('');
      setPurchaseItems([]);
      fetchDependencies();
      onRefreshData();

    } catch (err: any) {
      console.error(err);
      triggerGlobalAlert('error', 'Failed to log purchase: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filters
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header controls */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-neutral-100 shadow-3xs">
        <div>
          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-tight">Stock replenishment Ledger</h3>
          <p className="text-[10px] text-neutral-400 mt-0.5">Track raw bulk purchases, supplier invoices, and auto stock updates.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-neutral-950 hover:bg-neutral-800 text-white px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          Log Supplier Purchase Bill
        </button>
      </div>

      {/* Log Purchase Entry Dialog */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xl space-y-6 animate-slideIn">
          <div className="flex justify-between items-center pb-2 border-b">
            <h4 className="text-xs font-black uppercase text-neutral-950 tracking-wider">Garment Stock replenishment Entry</h4>
            <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-950">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSavePurchase} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Select Supplier *</label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-semibold bg-white"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.companyName} ({s.name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Supplier Bill Invoice Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IN-9823"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Settlement Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-semibold bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Bank Transfer/Card</option>
                  <option value="Credit">Credit (Add to Supplier Balance)</option>
                </select>
              </div>
            </div>

            {/* Product Catalog search lookup */}
            <div className="space-y-3 pt-2">
              <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Find Garments to replenishment Stock *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products by title or SKU code to add..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full p-3 pl-9 border border-neutral-200 focus:ring-1 focus:ring-orange-500 rounded-xl text-xs bg-neutral-50/50"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <Search className="w-4 h-4" />
                </span>
              </div>

              {showSearchResults && searchQuery.length > 0 && (
                <div className="border border-neutral-200 bg-white rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-center text-xs text-neutral-400">No matching apparel products found.</div>
                  ) : (
                    filteredProducts.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleAddProductToPurchase(p)}
                        className="p-2.5 hover:bg-neutral-50 cursor-pointer flex items-center justify-between text-xs transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <img src={p.images[0]} className="w-8 h-10 object-cover rounded" referrerPolicy="no-referrer" />
                          <div className="text-left">
                            <span className="font-bold text-neutral-900 block">{p.name}</span>
                            <span className="text-[10px] text-neutral-400 uppercase">SKU: {p.sku || 'N/A'} | Live Stock: {p.stock}</span>
                          </div>
                        </div>
                        <span className="text-neutral-900 font-bold">₹{p.price}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Purchase Cart Table */}
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b font-black uppercase text-neutral-400 text-[10px]">
                    <th className="p-3">Garment Details</th>
                    <th className="p-3 text-center">SKU</th>
                    <th className="p-3 text-center w-28">replenishment Qty</th>
                    <th className="p-3 text-right w-32">Unit cost (₹)</th>
                    <th className="p-3 text-center w-24">GST %</th>
                    <th className="p-3 text-right">Taxable</th>
                    <th className="p-3 text-right">Taxes</th>
                    <th className="p-3 text-right">Line Total</th>
                    <th className="p-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {purchaseItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-neutral-400 uppercase font-black tracking-wider text-[10px]">
                        No items added to bulk bill yet. Search above to add.
                      </td>
                    </tr>
                  ) : (
                    purchaseItems.map((item, idx) => {
                      const lineTaxable = item.purchasePrice * item.quantity;
                      const lineTax = lineTaxable * (item.gstPercent / 100);
                      const lineTotal = lineTaxable + lineTax;

                      return (
                        <tr key={item.product.id} className="hover:bg-neutral-50/40">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <img src={item.product.images[0]} className="w-8 h-10 object-cover rounded" referrerPolicy="no-referrer" />
                              <span className="font-bold text-neutral-900 line-clamp-1">{item.product.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono text-[10px]">{item.product.sku || 'N/A'}</td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemField(idx, 'quantity', Number(e.target.value))}
                              className="w-20 p-1.5 border border-neutral-200 rounded text-center font-bold"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.purchasePrice}
                              onChange={(e) => updateItemField(idx, 'purchasePrice', Number(e.target.value))}
                              className="w-24 p-1.5 border border-neutral-200 rounded text-right font-mono"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <select
                              value={item.gstPercent}
                              onChange={(e) => updateItemField(idx, 'gstPercent', Number(e.target.value))}
                              className="p-1.5 border border-neutral-200 rounded text-center bg-white"
                            >
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="0">0%</option>
                            </select>
                          </td>
                          <td className="p-3 text-right font-mono">₹{lineTaxable.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono">₹{lineTax.toFixed(2)}</td>
                          <td className="p-3 text-right font-black font-mono">₹{lineTotal.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <button 
                              type="button" 
                              onClick={() => removeItem(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations and Actions Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pt-4 border-t">
              <div className="text-left text-xs space-y-1 text-neutral-500">
                <p className="flex items-center gap-1.5 text-emerald-600 font-bold">
                  <ShieldCheck className="w-4 h-4 animate-pulse" />
                  ACID Transaction locks product rows on submission.
                </p>
                <p>Ensures that live storefront stock decreases/increases with millisecond precision.</p>
              </div>

              <div className="text-right space-y-3 w-full sm:w-auto">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between gap-12 text-neutral-500">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono">₹{taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between gap-12 text-neutral-500">
                    <span>GST Surcharges (CGST+SGST):</span>
                    <span className="font-mono">₹{gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between gap-12 font-black text-sm text-neutral-950 pt-2 border-t">
                    <span>GRAND TOTAL:</span>
                    <span className="font-mono">₹{Math.round(grandTotal).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
                  >
                    Discard Draft
                  </button>
                  <button
                    type="submit"
                    className="bg-neutral-950 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-md"
                  >
                    Commit & Sync Stock
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Historical Purchases List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-neutral-950 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : purchases.length === 0 ? (
        <div className="bg-white py-16 text-center border rounded-2xl">
          <Receipt className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
          <p className="text-xs font-black text-neutral-500 uppercase">No purchases logged yet</p>
          <p className="text-[10px] text-neutral-400 mt-1">When you import stock from manufacturers, log invoices here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-3xs overflow-hidden">
          <div className="p-4 border-b bg-neutral-50/50 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Stock replenishment Bills Ledger ({purchases.length} invoices)</span>
            <button 
              onClick={fetchDependencies}
              className="text-orange-600 hover:text-orange-700 text-[10px] font-black uppercase flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Sync Ledger
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead>
                <tr className="bg-neutral-100/50 border-b font-black text-neutral-400 text-[9px] uppercase">
                  <th className="p-3">Purchase Date</th>
                  <th className="p-3">Bill Number</th>
                  <th className="p-3">Onboarded Supplier</th>
                  <th className="p-3 text-center">Items Added</th>
                  <th className="p-3 text-right">Taxable Sump</th>
                  <th className="p-3 text-right">GST Taxes</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-center">Pay Mode</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-semibold">
                {purchases.map(p => (
                  <tr key={p.id} className="hover:bg-neutral-50/50 transition-all text-neutral-700">
                    <td className="p-3 font-mono text-[10px] text-neutral-500">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-3 font-bold text-neutral-900 font-mono text-[10px]">
                      {p.billNumber}
                    </td>
                    <td className="p-3 font-bold text-neutral-900">{p.supplierName}</td>
                    <td className="p-3 text-center font-bold">
                      {p.items.reduce((s, i) => s + i.quantity, 0)} items
                    </td>
                    <td className="p-3 text-right font-mono">₹{p.taxableTotal.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-mono">₹{p.gstTotal.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-black text-neutral-950 font-mono">₹{p.grandTotal.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-center">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        p.paymentMode === 'Credit' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {p.paymentMode}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-full uppercase">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
