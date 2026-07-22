import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { POSCustomer } from '../../types';
import { 
  Users, Search, Plus, Trash2, Edit2, Phone, Sparkles, 
  Wallet, ShieldAlert, CheckCircle, Mail, MapPin, Gift, X 
} from 'lucide-react';

interface CustomersLoyaltyProps {
  onRefreshData: () => void;
  triggerGlobalAlert: (type: 'success' | 'error', text: string) => void;
}

export default function CustomersLoyalty({
  onRefreshData,
  triggerGlobalAlert
}: CustomersLoyaltyProps) {
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'pos_customers'));
      const list: POSCustomer[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as POSCustomer);
      });
      setCustomers(list);
    } catch (e: any) {
      console.error(e);
      triggerGlobalAlert('error', 'Failed to fetch customer database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setGstin('');
    setLoyaltyPoints(0);
    setWalletBalance(0);
    setShowForm(false);
  };

  const handleStartEdit = (c: POSCustomer) => {
    setEditId(c.id);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || '');
    setAddress(c.address || '');
    setGstin(c.gstin || '');
    setLoyaltyPoints(c.loyaltyPoints);
    setWalletBalance(c.walletBalance);
    setShowForm(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      triggerGlobalAlert('error', 'Customer Name and Phone are mandatory!');
      return;
    }

    const payloadId = editId || `cust_${Date.now()}`;
    const payload: POSCustomer = {
      id: payloadId,
      name: name.trim(),
      phone: phone.trim(),
      loyaltyPoints: Number(loyaltyPoints),
      walletBalance: Number(walletBalance),
      createdDate: editId ? (customers.find(c => c.id === editId)?.createdDate || new Date().toISOString()) : new Date().toISOString()
    };

    if (email.trim()) {
      payload.email = email.trim();
    }
    if (address.trim()) {
      payload.address = address.trim();
    }
    if (gstin.trim()) {
      payload.gstin = gstin.trim().toUpperCase();
    }

    try {
      await setDoc(doc(db, 'pos_customers', payloadId), payload);
      triggerGlobalAlert('success', `Customer profile "${payload.name}" updated!`);
      resetForm();
      fetchCustomers();
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerGlobalAlert('error', 'Failed to save customer profile: ' + err.message);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete customer profile "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'pos_customers', id));
      triggerGlobalAlert('success', 'Customer profile deleted.');
      fetchCustomers();
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerGlobalAlert('error', 'Failed to delete customer: ' + err.message);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header controls toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-neutral-100 shadow-3xs">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search customers by name, phone, GSTIN..."
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
          Register Walk-in Customer
        </button>
      </div>

      {/* Customer profile add/edit form */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b">
            <h3 className="text-xs font-black uppercase text-neutral-950 tracking-wider">
              {editId ? 'Modify customer Loyalty Profile' : 'Register New Store Customer'}
            </h3>
            <button onClick={resetForm} className="text-neutral-400 hover:text-neutral-950">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveCustomer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sriranjani S."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Active Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9443210982"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. customer@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">GSTIN (Optional Corporate)</label>
                <input
                  type="text"
                  placeholder="e.g. 33AAAAA1111A1Z1"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs uppercase"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Customer Address</label>
                <input
                  type="text"
                  placeholder="e.g. Thillai Nagar, Trichy, TN"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Loyalty Points Balance</label>
                <input
                  type="number"
                  value={loyaltyPoints}
                  onChange={(e) => setLoyaltyPoints(Number(e.target.value))}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Store credit Balance (Wallet)</label>
                <input
                  type="number"
                  value={walletBalance}
                  onChange={(e) => setWalletBalance(Number(e.target.value))}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={resetForm}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-500"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-neutral-950 text-white font-black text-xs uppercase tracking-wider px-6 py-2 rounded-lg"
              >
                Save Customer Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customer profiles grid list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-neutral-950 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white py-16 text-center border rounded-2xl">
          <Users className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
          <p className="text-xs font-black text-neutral-500 uppercase">No customer profiles found</p>
          <p className="text-[10px] text-neutral-400 mt-1">Cashiers can register phone numbers to distribute reward points.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map(c => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-3xs flex flex-col justify-between space-y-4 hover:shadow-xs transition-all">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="text-left">
                    <span className="text-[9px] bg-orange-50 font-black px-2.5 py-1 rounded-full text-orange-600 uppercase tracking-widest">
                      Loyalty tier
                    </span>
                    <h4 className="text-sm font-black text-neutral-950 mt-2.5">{c.name}</h4>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => handleStartEdit(c)}
                      className="p-1.5 hover:bg-neutral-100 text-neutral-600 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCustomer(c.id, c.name)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-2 border-t border-dashed text-neutral-600 text-left">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="font-bold">{c.phone}</span>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{c.address}</span>
                    </div>
                  )}
                  {c.gstin && (
                    <div className="flex items-center gap-2 font-mono text-[9px] text-neutral-600 font-bold bg-neutral-100 py-0.5 px-2 rounded w-fit">
                      <span>GST: {c.gstin}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reward Points and Wallet Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-orange-50/40 p-3 rounded-xl border border-orange-100/50 flex flex-col justify-center text-left">
                  <div className="flex items-center gap-1.5 text-orange-600 mb-1">
                    <Gift className="w-3.5 h-3.5" />
                    <span className="text-[9px] uppercase font-black tracking-wider leading-none">Loyalty Points</span>
                  </div>
                  <span className="text-sm font-black text-neutral-900">{c.loyaltyPoints} pts</span>
                  <span className="text-[8px] text-neutral-400">Value: ₹{c.loyaltyPoints}</span>
                </div>

                <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/50 flex flex-col justify-center text-left">
                  <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                    <Wallet className="w-3.5 h-3.5" />
                    <span className="text-[9px] uppercase font-black tracking-wider leading-none">Store Credit</span>
                  </div>
                  <span className="text-sm font-black text-neutral-900">₹{c.walletBalance}</span>
                  <span className="text-[8px] text-neutral-400">Available balance</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
