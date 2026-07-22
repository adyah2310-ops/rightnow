import React, { useState } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { Product } from '../../types';
import { 
  Boxes, AlertTriangle, ArrowLeftRight, CheckCircle, Search, 
  Settings, RefreshCw, Layers, Sparkles, TrendingDown, X 
} from 'lucide-react';

interface InventoryManagerProps {
  products: Product[];
  onRefreshData: () => void;
  triggerGlobalAlert: (type: 'success' | 'error', text: string) => void;
}

export default function InventoryManager({
  products,
  onRefreshData,
  triggerGlobalAlert
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Transfer stock state
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferDirection, setTransferDirection] = useState<'W_TO_S' | 'S_TO_W'>('W_TO_S'); // Warehouse to Store or vice-versa

  // Manual stock adjustment state
  const [showAuditPanel, setShowAuditPanel] = useState(false);
  const [auditProductId, setAuditProductId] = useState('');
  const [auditType, setAuditType] = useState<'STORE_ADJUST' | 'WAREHOUSE_ADJUST' | 'WRITE_OFF'>('STORE_ADJUST');
  const [auditQty, setAuditQty] = useState(1);
  const [auditReason, setAuditReason] = useState('');

  // Handle stock transfer transaction
  const handleStockTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      triggerGlobalAlert('error', 'Select an apparel product to transfer stock.');
      return;
    }
    if (transferQty <= 0) {
      triggerGlobalAlert('error', 'Transfer quantity must be greater than zero.');
      return;
    }

    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    // Check pre-conditions
    const currentW = prod.warehouseStock ?? prod.stock;
    const currentS = prod.storeStock ?? 0;

    if (transferDirection === 'W_TO_S' && currentW < transferQty) {
      triggerGlobalAlert('error', `Insufficient warehouse stock. Max available is ${currentW} units.`);
      return;
    }
    if (transferDirection === 'S_TO_W' && currentS < transferQty) {
      triggerGlobalAlert('error', `Insufficient store stock. Max available is ${currentS} units.`);
      return;
    }

    setSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        // Query product ref
        const productRef = doc(db, 'products', prod.id);
        const pDoc = await transaction.get(productRef);
        if (!pDoc.exists()) {
          throw new Error('Product does not exist.');
        }

        const data = pDoc.data() as Product;
        const freshW = data.warehouseStock ?? data.stock;
        const freshS = data.storeStock ?? 0;
        const freshTotal = data.stock;

        let finalW = freshW;
        let finalS = freshS;

        if (transferDirection === 'W_TO_S') {
          if (freshW < transferQty) throw new Error('Warehouse stock decreased during transaction.');
          finalW = freshW - transferQty;
          finalS = freshS + transferQty;
        } else {
          if (freshS < transferQty) throw new Error('Store stock decreased during transaction.');
          finalW = freshW + transferQty;
          finalS = freshS - transferQty;
        }

        transaction.update(productRef, {
          warehouseStock: finalW,
          storeStock: finalS,
          // Combined total stock remains unchanged for transfers
          stock: freshTotal,
          updatedDate: new Date().toISOString()
        });

        // Log transaction
        const logId = `log_${Date.now()}`;
        const logRef = doc(db, 'activity_logs', logId);
        transaction.set(logRef, {
          id: logId,
          employeeId: 'owner_admin',
          employeeName: 'Store Administrator',
          action: 'Stock Transfer',
          details: `Transferred ${transferQty} units of "${data.name}" (${transferDirection === 'W_TO_S' ? 'Warehouse → Shop Floor' : 'Shop Floor → Warehouse'})`,
          timestamp: new Date().toISOString()
        });
      });

      triggerGlobalAlert('success', `Transferred ${transferQty} units of "${prod.name}" successfully.`);
      setShowTransferPanel(false);
      setTransferQty(1);
      setSelectedProductId('');
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerGlobalAlert('error', 'Stock transfer failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle audit adjustments
  const handleStockAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditProductId) {
      triggerGlobalAlert('error', 'Please select a product for manual stock adjustment.');
      return;
    }

    const prod = products.find(p => p.id === auditProductId);
    if (!prod) return;

    setSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, 'products', prod.id);
        const pDoc = await transaction.get(productRef);
        if (!pDoc.exists()) {
          throw new Error('Product not found.');
        }

        const data = pDoc.data() as Product;
        let finalW = data.warehouseStock ?? data.stock;
        let finalS = data.storeStock ?? 0;
        let finalTotal = data.stock;

        if (auditType === 'STORE_ADJUST') {
          // Adjust physical storefront stock
          finalS = auditQty;
          finalTotal = finalW + finalS;
        } else if (auditType === 'WAREHOUSE_ADJUST') {
          // Adjust warehouse stock
          finalW = auditQty;
          finalTotal = finalW + finalS;
        } else if (auditType === 'WRITE_OFF') {
          // Write off damaged or lost goods
          if (finalTotal < auditQty) {
            throw new Error(`Cannot write off ${auditQty} units. Total combined stock is only ${finalTotal}.`);
          }
          // Reduce proportionally or from store floor first
          if (finalS >= auditQty) {
            finalS -= auditQty;
          } else {
            const remainder = auditQty - finalS;
            finalS = 0;
            finalW = Math.max(0, finalW - remainder);
          }
          finalTotal = finalW + finalS;
        }

        transaction.update(productRef, {
          warehouseStock: finalW,
          storeStock: finalS,
          stock: finalTotal,
          updatedDate: new Date().toISOString()
        });

        // Save activity log
        const logId = `log_${Date.now()}`;
        const logRef = doc(db, 'activity_logs', logId);
        transaction.set(logRef, {
          id: logId,
          employeeId: 'owner_admin',
          employeeName: 'Store Administrator',
          action: 'Manual Inventory Audit',
          details: `Adjusted inventory for "${data.name}". Type: ${auditType}, Value: ${auditQty} units. Reason: ${auditReason || 'Routine stock auditing'}`,
          timestamp: new Date().toISOString()
        });
      });

      triggerGlobalAlert('success', `Inventory updated for "${prod.name}" successfully!`);
      setShowAuditPanel(false);
      setAuditQty(1);
      setAuditReason('');
      setAuditProductId('');
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerGlobalAlert('error', 'Audit adjustment failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI stats blocks for Inventory */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-100 shadow-3xs flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Total Catalog SKU Count</span>
            <span className="text-xl font-black text-neutral-900">{products.length} Garments</span>
          </div>
          <Boxes className="w-8 h-8 text-neutral-300" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-100 shadow-3xs flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Warehouse Stock sum</span>
            <span className="text-xl font-black text-neutral-950">
              {products.reduce((s, p) => s + (p.warehouseStock ?? p.stock), 0)} Units
            </span>
          </div>
          <Layers className="w-8 h-8 text-neutral-300" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-100 shadow-3xs flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Store Front Floor Stock</span>
            <span className="text-xl font-black text-neutral-950">
              {products.reduce((s, p) => s + (p.storeStock ?? 0), 0)} Units
            </span>
          </div>
          <Sparkles className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-100 shadow-3xs flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Critically Low Stock SKUs</span>
            <span className="text-xl font-black text-red-600">
              {products.filter(p => p.stock <= (p.minimumStock || 5)).length} Alerts
            </span>
          </div>
          <AlertTriangle className="w-8 h-8 text-red-400 animate-bounce" />
        </div>
      </div>

      {/* Main Operations Header toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-neutral-100 shadow-3xs">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search catalog inventory by name, SKU, barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-neutral-950 bg-neutral-50"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => { setShowTransferPanel(true); setShowAuditPanel(false); }}
            className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Transfer Stock Floor
          </button>
          <button
            onClick={() => { setShowAuditPanel(true); setShowTransferPanel(false); }}
            className="w-full sm:w-auto bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
          >
            <Settings className="w-4 h-4" />
            Manual stock Audit
          </button>
        </div>
      </div>

      {/* TRANSFER STOCK PANEL */}
      {showTransferPanel && (
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xl space-y-4 animate-slideIn">
          <div className="flex justify-between items-center pb-2 border-b">
            <h4 className="text-xs font-black uppercase text-neutral-950 tracking-wider">Internal Stock Transfer Pipeline</h4>
            <button onClick={() => setShowTransferPanel(false)} className="text-neutral-400 hover:text-neutral-950">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleStockTransfer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Select Apparel Product *</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs bg-white font-semibold"
                >
                  <option value="">-- Choose garment product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (SKU: {p.sku || 'N/A'} • Live W:{p.warehouseStock ?? p.stock} S:{p.storeStock ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Transfer Direction *</label>
                <select
                  value={transferDirection}
                  onChange={(e) => setTransferDirection(e.target.value as any)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs bg-white font-semibold"
                >
                  <option value="W_TO_S">Warehouse ➔ Shop Floor</option>
                  <option value="S_TO_W">Shop Floor ➔ Warehouse</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Transfer Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, Number(e.target.value)))}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setShowTransferPanel(false)}
                className="px-4 py-2 text-xs font-bold uppercase text-neutral-500"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="bg-neutral-950 text-white font-black text-xs uppercase tracking-wider px-6 py-2 rounded-lg"
              >
                {submitting ? 'Transferring...' : 'Commit Transfer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MANUAL STOCK AUDIT Adjustments */}
      {showAuditPanel && (
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xl space-y-4 animate-slideIn">
          <div className="flex justify-between items-center pb-2 border-b">
            <h4 className="text-xs font-black uppercase text-neutral-950 tracking-wider">Manual Inventory Audit adjustment</h4>
            <button onClick={() => setShowAuditPanel(false)} className="text-neutral-400 hover:text-neutral-950">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleStockAudit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Select Product to Audit *</label>
                <select
                  required
                  value={auditProductId}
                  onChange={(e) => setAuditProductId(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs bg-white font-semibold"
                >
                  <option value="">-- Choose garment product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (SKU: {p.sku || 'N/A'} • Live W:{p.warehouseStock ?? p.stock} S:{p.storeStock ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Audit Operation Type *</label>
                <select
                  value={auditType}
                  onChange={(e) => setAuditType(e.target.value as any)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs bg-white font-semibold"
                >
                  <option value="STORE_ADJUST">Force Store Stock value</option>
                  <option value="WAREHOUSE_ADJUST">Force Warehouse Stock value</option>
                  <option value="WRITE_OFF">Write off Damaged Goods (Deduct)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Quantity/Value *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={auditQty}
                  onChange={(e) => setAuditQty(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Audit Reconciliation Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Annual routine inventory stock check, damaged linen, write off lost logistics cargo"
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setShowAuditPanel(false)}
                className="px-4 py-2 text-xs font-bold uppercase text-neutral-500"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="bg-neutral-950 text-white font-black text-xs uppercase tracking-wider px-6 py-2 rounded-lg"
              >
                {submitting ? 'Applying Audit...' : 'Commit Audit adjustment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Stock Levels table list */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-3xs overflow-hidden">
        <div className="p-4 border-b bg-neutral-50/50 flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Live Inventory stock ledger ({products.length} garments)</span>
          <button 
            onClick={() => { onRefreshData(); triggerGlobalAlert('success', 'Refreshed active stock records!'); }}
            className="text-orange-600 hover:text-orange-700 text-[10px] font-black uppercase flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh Stock levels
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead>
              <tr className="bg-neutral-100/50 border-b font-black text-neutral-400 text-[9px] uppercase">
                <th className="p-3 w-16">Image</th>
                <th className="p-3">Garment / Apparel Product</th>
                <th className="p-3 text-center">SKU Code</th>
                <th className="p-3 text-center">Barcode</th>
                <th className="p-3 text-center w-28">Store Front Stock</th>
                <th className="p-3 text-center w-28">Warehouse Stock</th>
                <th className="p-3 text-center w-28">Combined Live Stock</th>
                <th className="p-3 text-center w-24 font-bold text-neutral-500">Min. Stock</th>
                <th className="p-3 text-center">Status Indicators</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-700">
              {filteredProducts.map(p => {
                const combined = p.stock;
                const warehouse = p.warehouseStock ?? p.stock;
                const store = p.storeStock ?? 0;
                const limit = p.minimumStock || 5;
                const isLow = combined <= limit;

                return (
                  <tr key={p.id} className={`hover:bg-neutral-50/50 transition-all ${isLow ? 'bg-red-50/20' : ''}`}>
                    <td className="p-3">
                      <img src={p.images[0]} className="w-10 h-13 object-cover rounded shadow-2xs border" referrerPolicy="no-referrer" />
                    </td>
                    <td className="p-3 text-left">
                      <span className="font-bold text-neutral-900 block text-xs line-clamp-1">{p.name}</span>
                      <span className="text-[10px] text-neutral-400 uppercase font-bold">{p.brand} • {p.category}</span>
                    </td>
                    <td className="p-3 text-center font-mono text-[10px] text-neutral-900 font-bold">{p.sku || 'N/A'}</td>
                    <td className="p-3 text-center font-mono text-[10px] text-neutral-500">{p.barcode || 'N/A'}</td>
                    <td className="p-3 text-center font-mono font-black text-neutral-900 text-[13px]">{store}</td>
                    <td className="p-3 text-center font-mono text-neutral-600 text-[13px]">{warehouse}</td>
                    <td className="p-3 text-center font-mono font-black text-[14px]">
                      <span className={combined <= 0 ? 'text-red-600' : isLow ? 'text-amber-600 animate-pulse' : 'text-neutral-950'}>
                        {combined}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-neutral-400 text-[11px]">{limit}</td>
                    <td className="p-3 text-center">
                      {combined <= 0 ? (
                        <span className="text-[9px] bg-red-100 text-red-800 font-black uppercase px-2 py-0.5 rounded-full tracking-wider border border-red-200">
                          Out of stock
                        </span>
                      ) : isLow ? (
                        <span className="text-[9px] bg-amber-50 text-amber-800 font-black uppercase px-2 py-0.5 rounded-full tracking-wider border border-amber-200 flex items-center gap-1 justify-center w-fit mx-auto">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Low stock
                        </span>
                      ) : (
                        <span className="text-[9px] bg-emerald-50 text-emerald-800 font-black uppercase px-2 py-0.5 rounded-full tracking-wider border border-emerald-200">
                          Healthy stock
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
