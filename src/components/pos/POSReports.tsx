import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { POSSale, Order, PurchaseRecord, ExpenseRecord, Product } from '../../types';
import { 
  BarChart3, TrendingUp, TrendingDown, RefreshCw, Plus, 
  Trash2, Download, Landmark, Receipt, Calendar, HelpCircle, X 
} from 'lucide-react';

interface POSReportsProps {
  products: Product[];
  allOnlineOrders: Order[];
}

export default function POSReports({
  products,
  allOnlineOrders
}: POSReportsProps) {
  const [offlineSales, setOfflineSales] = useState<POSSale[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Active sub-tab
  const [reportTab, setReportTab] = useState<'PL' | 'GST' | 'EXPENSE' | 'CHANNELS'>('PL');

  // Expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<'Rent' | 'Electricity' | 'Salaries' | 'Marketing' | 'Supplies' | 'Other'>('Supplies');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      // Load offline POS sales
      const saleSnap = await getDocs(collection(db, 'pos_sales'));
      const saleList: POSSale[] = [];
      saleSnap.forEach(doc => {
        saleList.push({ id: doc.id, ...doc.data() } as POSSale);
      });
      setOfflineSales(saleList);

      // Load purchases
      const purSnap = await getDocs(collection(db, 'purchases'));
      const purList: PurchaseRecord[] = [];
      purSnap.forEach(doc => {
        purList.push({ id: doc.id, ...doc.data() } as PurchaseRecord);
      });
      setPurchases(purList);

      // Load expenses
      const expSnap = await getDocs(collection(db, 'expenses'));
      const expList: ExpenseRecord[] = [];
      expSnap.forEach(doc => {
        expList.push({ id: doc.id, ...doc.data() } as ExpenseRecord);
      });
      // Sort expenses by date
      expList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(expList);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || Number(expenseAmount) <= 0 || !expenseDesc.trim()) {
      alert('Please fill out correct amount and explanation details.');
      return;
    }

    const expId = `exp_${Date.now()}`;
    const payload: ExpenseRecord = {
      id: expId,
      category: expenseCategory,
      amount: Number(expenseAmount),
      description: expenseDesc.trim(),
      date: expenseDate,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'expenses', expId), payload);
      setExpenseAmount('');
      setExpenseDesc('');
      setShowExpenseForm(false);
      fetchReportsData();
    } catch (err) {
      console.error(err);
      alert('Failed to log expense record');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Delete this expense line item?')) return;
    try {
      await deleteDoc(doc(db, 'expenses', id));
      fetchReportsData();
    } catch (e) {
      console.error(e);
    }
  };

  // FINANCIAL REPORT COMPUTATIONS
  // 1. Revenue
  const totalOfflineRevenue = offlineSales
    .filter(s => s.status !== 'Cancelled')
    .reduce((sum, s) => sum + s.grandTotal, 0);

  const totalOnlineRevenue = allOnlineOrders
    .filter(o => o.status !== 'Cancelled' && o.status !== 'Payment Verification Pending')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalGrossRevenue = totalOfflineRevenue + totalOnlineRevenue;

  // 2. Cost of Goods Sold (COGS)
  // We approximate COGS based on actual item purchasePrice when sold, or fallback to 55% of Selling price if undefined
  const totalOfflineCogs = offlineSales
    .filter(s => s.status !== 'Cancelled')
    .flatMap(s => s.items)
    .reduce((sum, item) => {
      const match = products.find(p => p.id === item.productId);
      const cost = match?.purchasePrice || (item.sellingPrice * 0.55);
      return sum + (cost * item.quantity);
    }, 0);

  const totalOnlineCogs = allOnlineOrders
    .filter(o => o.status !== 'Cancelled' && o.status !== 'Payment Verification Pending')
    .flatMap(o => o.items)
    .reduce((sum, item) => {
      const match = products.find(p => p.id === item.productId);
      const cost = match?.purchasePrice || (item.price * 0.55);
      return sum + (cost * item.quantity);
    }, 0);

  const totalCogsSum = totalOfflineCogs + totalOnlineCogs;

  // 3. Operational Expenses
  const totalExpensesLogged = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // 4. Net Profit
  const netEarningsProfit = totalGrossRevenue - totalCogsSum - totalExpensesLogged;

  // TAX GST COMPUTATIONS (OFFLINE + ONLINE COMBINED)
  const totalOfflineGst = offlineSales
    .filter(s => s.status !== 'Cancelled')
    .reduce((sum, s) => sum + s.taxTotal, 0);

  // Online items GST (approx. 5% if not defined in older schema)
  const totalOnlineGst = allOnlineOrders
    .filter(o => o.status !== 'Cancelled' && o.status !== 'Payment Verification Pending')
    .flatMap(o => o.items)
    .reduce((sum, item) => {
      const gstPct = item.gstPercent || 5;
      const basePrice = item.price;
      const taxable = basePrice / (1 + (gstPct / 100));
      return sum + ((basePrice - taxable) * item.quantity);
    }, 0);

  const totalTaxGstCollected = totalOfflineGst + totalOnlineGst;

  // CSV EXCEL EXPORT FUNCTION
  const handleExportCSV = (type: 'SALES' | 'EXPENSE' | 'GST') => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (type === 'SALES') {
      filename = 'POS_Sales_Report.csv';
      headers = ['Date', 'Invoice No', 'Channel', 'Customer Name', 'Phone', 'Items Qty', 'Subtotal', 'GST Surcharges', 'Total Amount', 'Pay Mode'];
      
      // Combine POS & Web
      offlineSales.forEach(s => {
        rows.push([
          new Date(s.createdAt).toLocaleDateString('en-IN'),
          s.invoiceNumber,
          'POS (In-store)',
          s.customerName || 'Walk-In',
          s.customerPhone || '',
          s.items.reduce((sum, i) => sum + i.quantity, 0).toString(),
          s.subTotal.toString(),
          s.taxTotal.toString(),
          s.grandTotal.toString(),
          s.paymentMode
        ]);
      });
      allOnlineOrders.forEach(o => {
        rows.push([
          new Date(o.createdAt).toLocaleDateString('en-IN'),
          o.orderNumber,
          'E-Commerce Website',
          o.customerName,
          o.customerPhone,
          o.items.reduce((sum, i) => sum + i.quantity, 0).toString(),
          (o.totalAmount - (o.deliveryCharge || 0)).toString(),
          'Computed',
          o.totalAmount.toString(),
          'UPI Screen'
        ]);
      });
    } else if (type === 'EXPENSE') {
      filename = 'Store_Expenses_Report.csv';
      headers = ['Date', 'Category', 'Explanation Details', 'Outflow Amount (INR)'];
      expenses.forEach(e => {
        rows.push([e.date, e.category, e.description, e.amount.toString()]);
      });
    } else {
      filename = 'GST_Tax_Ledger_Report.csv';
      headers = ['Date', 'Invoice/Order No', 'Type', 'Apparel SKU', 'GST %', 'Taxable amount', 'CGST Sump', 'SGST Sump', 'Combined Tax'];
      
      offlineSales.forEach(s => {
        s.items.forEach(item => {
          rows.push([
            new Date(s.createdAt).toLocaleDateString('en-IN'),
            s.invoiceNumber,
            'In-store',
            item.sku,
            item.gstPercent.toString(),
            item.taxableAmount.toString(),
            item.cgst.toString(),
            item.sgst.toString(),
            (item.cgst + item.sgst).toString()
          ]);
        });
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sales Analytics Overview metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-3xs flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Combined Gross Sales</span>
            <span className="text-xl font-black text-neutral-900">₹{totalGrossRevenue.toLocaleString('en-IN')}</span>
            <span className="text-[9px] text-neutral-400 block mt-0.5">Online: ₹{totalOnlineRevenue.toLocaleString('en-IN')} | POS: ₹{totalOfflineRevenue.toLocaleString('en-IN')}</span>
          </div>
          <TrendingUp className="w-8 h-8 text-emerald-500" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-3xs flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Est. Cost of Goods (COGS)</span>
            <span className="text-xl font-black text-neutral-900">₹{totalCogsSum.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span className="text-[9px] text-neutral-400 block mt-0.5">Apparel base raw purchase manufacturing cost</span>
          </div>
          <Landmark className="w-8 h-8 text-neutral-300" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-3xs flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Cash Operational Expenses</span>
            <span className="text-xl font-black text-neutral-900">₹{totalExpensesLogged.toLocaleString('en-IN')}</span>
            <span className="text-[9px] text-neutral-400 block mt-0.5">Shop floor rent, electricity, cashier salaries</span>
          </div>
          <TrendingDown className="w-8 h-8 text-red-400" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-3xs flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Net Profit Earnings</span>
            <span className={`text-xl font-black ${netEarningsProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ₹{netEarningsProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[9px] text-neutral-400 block mt-0.5">Margin: {totalGrossRevenue ? ((netEarningsProfit / totalGrossRevenue) * 100).toFixed(1) : 0}%</span>
          </div>
          <BarChart3 className="w-8 h-8 text-indigo-500 animate-pulse" />
        </div>

      </div>

      {/* Reports navigation tab-bar */}
      <div className="border-b border-neutral-200 bg-white p-2 rounded-xl flex flex-wrap gap-2 shadow-3xs">
        {[
          { id: 'PL', label: 'Profit & Loss Statement', icon: Landmark },
          { id: 'GST', label: 'GST Tax collection Ledger', icon: Receipt },
          { id: 'EXPENSE', label: 'Store Expense tracker', icon: TrendingDown },
          { id: 'CHANNELS', label: 'Channel comparisons', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setReportTab(tab.id as any)}
            className={`py-2 px-4 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              reportTab === tab.id 
                ? 'bg-neutral-950 text-white shadow-xs' 
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* REPORT VIEW PORT: 1. PROFIT & LOSS STATEMENT */}
      {reportTab === 'PL' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-3 border-b">
            <div className="text-left">
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-950">Profit & Loss (P&L) Ledger</h4>
              <p className="text-[10px] text-neutral-400">Reconciles all incoming revenues against manufacturing COGS and local expenses.</p>
            </div>
            <button
              onClick={() => handleExportCSV('SALES')}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-black text-[10px] uppercase py-2 px-4 rounded-lg flex items-center gap-1 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export P&L Excel
            </button>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto text-xs text-left">
            <div className="flex justify-between items-center py-2.5 border-b font-bold text-neutral-800">
              <span className="uppercase">1. Gross Revenue Sales</span>
              <span>₹{totalGrossRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="pl-4 flex justify-between text-neutral-500">
              <span>• Store Front POS Sales (Offline)</span>
              <span>₹{totalOfflineRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="pl-4 flex justify-between text-neutral-500">
              <span>• Website Orders (Online)</span>
              <span>₹{totalOnlineRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b font-bold text-neutral-800 pt-6">
              <span className="uppercase">2. Less: Cost of Goods Sold (COGS)</span>
              <span>- ₹{totalCogsSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="pl-4 flex justify-between text-neutral-500">
              <span>• Bulk Apparel purchase Cost (POS sales)</span>
              <span>₹{totalOfflineCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="pl-4 flex justify-between text-neutral-500">
              <span>• Bulk Apparel purchase Cost (Online orders)</span>
              <span>₹{totalOnlineCogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b font-bold text-neutral-900 bg-neutral-50 px-4 rounded">
              <span>GROSS PROFIT MARGIN</span>
              <span>₹{(totalGrossRevenue - totalCogsSum).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b font-bold text-neutral-800 pt-6">
              <span className="uppercase">3. Less: Local Store Expenses</span>
              <span>- ₹{totalExpensesLogged.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="pl-4 flex justify-between text-neutral-500">
              <span>• Operational Overheads (Electricity, Rent, Supplies)</span>
              <span>₹{totalExpensesLogged.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between items-center py-4 border-t-2 border-neutral-950 font-black text-sm text-neutral-950 bg-orange-50/50 px-4 rounded mt-6">
              <span className="uppercase tracking-wider">Net Profit earnings</span>
              <span className={netEarningsProfit >= 0 ? 'text-emerald-700 font-black' : 'text-red-700 font-black'}>
                ₹{netEarningsProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* REPORT VIEW PORT: 2. GST TAX LEDGER */}
      {reportTab === 'GST' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-3 border-b">
            <div className="text-left">
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-950">Indian GST tax Ledger (CGST & SGST)</h4>
              <p className="text-[10px] text-neutral-400">Maintains comprehensive legal ledger breaking down tax liabilities on apparel catalog sales.</p>
            </div>
            <button
              onClick={() => handleExportCSV('GST')}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-black text-[10px] uppercase py-2 px-4 rounded-lg flex items-center gap-1 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export GST tax Report
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-left">
              <span className="text-[8px] font-black uppercase tracking-wider text-neutral-400 block">Combined GST Surcharge</span>
              <span className="text-lg font-black text-neutral-950">₹{totalTaxGstCollected.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-left">
              <span className="text-[8px] font-black uppercase tracking-wider text-neutral-400 block">Central Tax CGST Sump</span>
              <span className="text-lg font-black text-neutral-900">₹{(totalTaxGstCollected / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-left">
              <span className="text-[8px] font-black uppercase tracking-wider text-neutral-400 block">State Tax SGST Sump</span>
              <span className="text-lg font-black text-neutral-900">₹{(totalTaxGstCollected / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="pt-4 text-xs text-neutral-500 font-semibold text-left">
            <p>✓ All items billed under POS and Online orders have their HSN codes and GST rates locked immediately during settlement.</p>
            <p className="mt-1">✓ compliance ready: Generate and share this CSV format with your Auditor for GSTR-1 filings.</p>
          </div>
        </div>
      )}

      {/* REPORT VIEW PORT: 3. STORE EXPENSE TRACKER */}
      {reportTab === 'EXPENSE' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-3 border-b">
            <div className="text-left">
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-950">operational Expense Ledger</h4>
              <p className="text-[10px] text-neutral-400">Track day-to-day storefront operational costs like rent, light bills, and cashier wages.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExpenseForm(true)}
                className="bg-neutral-950 hover:bg-neutral-800 text-white font-black text-[10px] uppercase py-2 px-4 rounded-lg flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Cash Expense
              </button>
              <button
                onClick={() => handleExportCSV('EXPENSE')}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-black text-[10px] uppercase py-2 px-4 rounded-lg flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {showExpenseForm && (
            <form onSubmit={handleAddExpense} className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 grid grid-cols-1 sm:grid-cols-4 gap-4 text-left animate-slideIn">
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Expense category *</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs bg-white font-semibold"
                >
                  <option value="Rent">Shop Floor Rent</option>
                  <option value="Electricity">Electricity & Utility</option>
                  <option value="Salaries">Cashier Wages / Salaries</option>
                  <option value="Marketing">Marketing & Banners</option>
                  <option value="Supplies">Packing supplies / Bags</option>
                  <option value="Other">Other Expenses</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Outflow Amount (INR) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Expense Date *</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Explanation / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Paid monthly showroom rent of Tennessee branch showroom"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>

              <div className="sm:col-span-4 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowExpenseForm(false)} className="px-4 py-2 text-xs font-bold uppercase text-neutral-500">Cancel</button>
                <button type="submit" className="bg-neutral-950 text-white font-black text-xs uppercase px-6 py-2 rounded-lg">Log Outflow</button>
              </div>
            </form>
          )}

          {/* Expenses list */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b font-black text-neutral-400 text-[9px] uppercase">
                  <th className="p-3">Expense Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Explanation Description</th>
                  <th className="p-3 text-right">Outflow Amount</th>
                  <th className="p-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-700">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-neutral-400 uppercase font-black text-[9px]">No cash expenses logged yet.</td>
                  </tr>
                ) : (
                  expenses.map(e => (
                    <tr key={e.id}>
                      <td className="p-3 font-mono text-neutral-500">{e.date}</td>
                      <td className="p-3">
                        <span className="bg-neutral-100 text-neutral-800 py-0.5 px-2.5 rounded-full text-[10px]">
                          {e.category}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-500 text-left">{e.description}</td>
                      <td className="p-3 text-right font-black text-red-600 font-mono">₹{e.amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => handleDeleteExpense(e.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT VIEW PORT: 4. CHANNEL COMPARISONS */}
      {reportTab === 'CHANNELS' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-6">
          <div className="text-left pb-3 border-b flex justify-between items-center">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-950">Channel performance & sales comparison</h4>
              <p className="text-[10px] text-neutral-400">Direct comparison between E-Commerce Web Storefront and In-Store POS Showroom.</p>
            </div>
            <span className="text-[10px] bg-neutral-100 text-neutral-700 font-bold px-3 py-1 rounded-full uppercase">
              Total Combined Turnover: ₹{(totalOnlineRevenue + totalOfflineRevenue).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Visual Channel Share Bar */}
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center text-[10px] font-black uppercase">
              <span className="text-indigo-700">Digital E-Commerce ({totalOnlineRevenue + totalOfflineRevenue > 0 ? Math.round((totalOnlineRevenue / (totalOnlineRevenue + totalOfflineRevenue)) * 100) : 0}%)</span>
              <span className="text-orange-700">Retail Outlet POS ({totalOnlineRevenue + totalOfflineRevenue > 0 ? Math.round((totalOfflineRevenue / (totalOnlineRevenue + totalOfflineRevenue)) * 100) : 0}%)</span>
            </div>
            <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden flex p-0.5 border">
              <div 
                style={{ width: `${totalOnlineRevenue + totalOfflineRevenue > 0 ? (totalOnlineRevenue / (totalOnlineRevenue + totalOfflineRevenue)) * 100 : 0}%` }} 
                className="bg-indigo-600 h-full rounded-l-full transition-all duration-500"
              ></div>
              <div 
                style={{ width: `${totalOnlineRevenue + totalOfflineRevenue > 0 ? (totalOfflineRevenue / (totalOnlineRevenue + totalOfflineRevenue)) * 100 : 0}%` }} 
                className="bg-orange-500 h-full rounded-r-full transition-all duration-500"
              ></div>
            </div>
          </div>

          {/* Side by side cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="bg-indigo-50/40 p-6 rounded-2xl border border-indigo-100 flex flex-col justify-between space-y-4 text-left">
              <div>
                <span className="text-[9px] bg-indigo-100 font-black px-2.5 py-1 rounded-full text-indigo-800 uppercase tracking-wider">
                  E-Commerce Storefront
                </span>
                <h3 className="text-2xl font-black text-indigo-950 mt-3">₹{totalOnlineRevenue.toLocaleString('en-IN')}</h3>
                <p className="text-[10px] text-indigo-700 mt-1 font-medium">{allOnlineOrders.length} online website orders completed.</p>
              </div>

              <div className="pt-3 border-t border-indigo-100 space-y-1 text-[11px] text-neutral-600">
                <div className="flex justify-between">
                  <span>Avg Order Value (AOV):</span>
                  <span className="font-bold text-neutral-900">₹{allOnlineOrders.length > 0 ? (totalOnlineRevenue / allOnlineOrders.length).toFixed(0) : 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax Collected:</span>
                  <span className="font-bold text-neutral-900">₹{totalOnlineGst.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Channel COGS:</span>
                  <span className="font-bold text-neutral-900">₹{totalOnlineCogs.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="bg-orange-50/40 p-6 rounded-2xl border border-orange-100 flex flex-col justify-between space-y-4 text-left">
              <div>
                <span className="text-[9px] bg-orange-100 font-black px-2.5 py-1 rounded-full text-orange-800 uppercase tracking-wider">
                  Brick-and-Mortar POS
                </span>
                <h3 className="text-2xl font-black text-orange-950 mt-3">₹{totalOfflineRevenue.toLocaleString('en-IN')}</h3>
                <p className="text-[10px] text-orange-700 mt-1 font-medium">{offlineSales.length} in-store cashier counter receipts generated.</p>
              </div>

              <div className="pt-3 border-t border-orange-100 space-y-1 text-[11px] text-neutral-600">
                <div className="flex justify-between">
                  <span>Avg Bill Value (ATV):</span>
                  <span className="font-bold text-neutral-900">₹{offlineSales.length > 0 ? (totalOfflineRevenue / offlineSales.length).toFixed(0) : 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>In-Store GST Collected:</span>
                  <span className="font-bold text-neutral-900">₹{totalOfflineGst.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Channel COGS:</span>
                  <span className="font-bold text-neutral-900">₹{totalOfflineCogs.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
