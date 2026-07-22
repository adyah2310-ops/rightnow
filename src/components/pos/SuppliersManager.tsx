import React, { useState, useEffect } from 'react';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Supplier } from '../../types';
import { 
  Users, Plus, Trash2, Edit2, Phone, Mail, MapPin, 
  CreditCard, Search, X, CheckCircle, ShieldAlert 
} from 'lucide-react';

interface SuppliersManagerProps {
  onRefreshData: () => void;
  triggerGlobalAlert: (type: 'success' | 'error', text: string) => void;
}

export default function SuppliersManager({
  onRefreshData,
  triggerGlobalAlert
}: SuppliersManagerProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState(0);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'suppliers'));
      const list: Supplier[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Supplier);
      });
      setSuppliers(list);
    } catch (e: any) {
      console.error(e);
      triggerGlobalAlert('error', 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setName('');
    setCompanyName('');
    setGstin('');
    setPhone('');
    setEmail('');
    setAddress('');
    setBalance(0);
    setShowForm(false);
  };

  const handleStartEdit = (s: Supplier) => {
    setEditId(s.id);
    setName(s.name);
    setCompanyName(s.companyName);
    setGstin(s.gstin || '');
    setPhone(s.phone);
    setEmail(s.email);
    setAddress(s.address);
    setBalance(s.balance);
    setShowForm(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !companyName.trim() || !phone.trim()) {
      triggerGlobalAlert('error', 'Name, Company, and Phone are mandatory!');
      return;
    }

    const payloadId = editId || `sup_${Date.now()}`;
    const payload: Supplier = {
      id: payloadId,
      name: name.trim(),
      companyName: companyName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      balance: Number(balance),
      createdDate: editId ? (suppliers.find(s => s.id === editId)?.createdDate || new Date().toISOString()) : new Date().toISOString()
    };

    if (gstin.trim()) {
      payload.gstin = gstin.trim().toUpperCase();
    }

    try {
      await setDoc(doc(db, 'suppliers', payloadId), payload);
      triggerGlobalAlert('success', `Supplier "${payload.companyName}" saved successfully!`);
      resetForm();
      fetchSuppliers();
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerGlobalAlert('error', 'Failed to save supplier: ' + err.message);
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'suppliers', id));
      triggerGlobalAlert('success', `Deleted supplier "${name}" successfully.`);
      fetchSuppliers();
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerGlobalAlert('error', 'Deletion failed: ' + err.message);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-neutral-100 shadow-3xs">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search suppliers by name, company, GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-neutral-950 bg-neutral-50"
          />
        </div>

        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-neutral-950 hover:bg-neutral-800 text-white px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          Onboard New Supplier
        </button>
      </div>

      {/* Onboarding Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b">
            <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">
              {editId ? 'Modify Onboarded Supplier' : 'Supplier Business Intake Profile'}
            </h3>
            <button onClick={resetForm} className="text-neutral-400 hover:text-neutral-900">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveSupplier} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Supplier Rep Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Company / Mill Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tirupur Cotton Mills"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">GSTIN (Indian Tax ID)</label>
                <input
                  type="text"
                  placeholder="e.g. 33AAAAA1111A1Z1"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs uppercase"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Corporate Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. sales@mill.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Dispatch / Mill Address</label>
                <input
                  type="text"
                  placeholder="Factory Street, Tirupur, TN"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Outstanding Balance (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={balance}
                  onChange={(e) => setBalance(Number(e.target.value))}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={resetForm}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-neutral-950 text-white font-black text-xs uppercase tracking-wider px-6 py-2 rounded-lg"
              >
                Save Supplier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Supplier Grid list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-neutral-950 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-white py-16 text-center border rounded-2xl">
          <Users className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
          <p className="text-xs font-black text-neutral-500 uppercase">No Suppliers Onboarded</p>
          <p className="text-[10px] text-neutral-400 mt-1">Get started by adding raw mills or textile suppliers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map(s => (
            <div key={s.id} className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-3xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="text-left">
                    <span className="text-[10px] bg-neutral-100 font-bold px-2.5 py-1 rounded-full text-neutral-600 uppercase">
                      ID: {s.id.slice(-5).toUpperCase()}
                    </span>
                    <h4 className="text-sm font-black text-neutral-950 mt-2">{s.companyName}</h4>
                    <p className="text-xs text-neutral-400 font-semibold">{s.name} (Rep)</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => handleStartEdit(s)}
                      className="p-1.5 hover:bg-neutral-100 text-neutral-600 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteSupplier(s.id, s.companyName)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-2 border-t border-dashed text-neutral-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{s.phone}</span>
                  </div>
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{s.address}</span>
                    </div>
                  )}
                  {s.gstin && (
                    <div className="flex items-center gap-2 font-mono text-[10px] text-orange-600 font-bold bg-orange-50/50 py-0.5 px-2 rounded w-fit">
                      <span>GSTIN: {s.gstin}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Balance Box */}
              <div className="bg-neutral-50 p-3.5 rounded-xl flex items-center justify-between border">
                <div className="flex items-center gap-2 text-left">
                  <CreditCard className="w-4 h-4 text-neutral-500" />
                  <div>
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block leading-tight">Outstanding Book Balance</span>
                    <span className="text-xs font-black text-neutral-900">₹{s.balance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  s.balance > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {s.balance > 0 ? 'Due Payment' : 'Settled'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
