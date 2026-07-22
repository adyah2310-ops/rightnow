import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { BusinessSettings } from '../../types';
import { 
  Settings, CheckCircle, RefreshCw, Key, ShieldCheck, 
  Store, Phone, Mail, FileText, Image as ImageIcon 
} from 'lucide-react';

interface SettingsManagerProps {
  onRefreshData: () => void;
  triggerGlobalAlert: (type: 'success' | 'error', text: string) => void;
}

export default function SettingsManager({
  onRefreshData,
  triggerGlobalAlert
}: SettingsManagerProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [storeName, setStoreName] = useState('Rightnow Garments');
  const [storeAddress, setStoreAddress] = useState('12, Factory Street, Tiruchirappalli, Tamil Nadu, 620001');
  const [storePhone, setStorePhone] = useState('+91 94432 10982');
  const [storeEmail, setStoreEmail] = useState('billing@rightnowgarments.com');
  const [storeGstin, setStoreGstin] = useState('33AAAAA1111A1Z1');
  const [upiQrUrl, setUpiQrUrl] = useState('https://images.unsplash.com/photo-1622630998477-20aa696ecb05?q=80&w=300&auto=format&fit=crop'); // default sample QR code image
  const [invoiceFooterMessage, setInvoiceFooterMessage] = useState('Thank you for supporting Local Rightnow Garments! We hope you love your premium apparel.');
  const [termsAndConditions, setTermsAndConditions] = useState('1. Exchange within 7 days. 2. Strictly no cash refunds.');

  const fetchBusinessSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'business_profile');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as BusinessSettings;
        setStoreName(data.storeName || 'Rightnow Garments');
        setStoreAddress(data.storeAddress || '12, Factory Street, Tiruchirappalli, Tamil Nadu, 620001');
        setStorePhone(data.storePhone || '+91 94432 10982');
        setStoreEmail(data.storeEmail || 'billing@rightnowgarments.com');
        setStoreGstin(data.storeGstin || '33AAAAA1111A1Z1');
        setUpiQrUrl(data.upiQrUrl || 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?q=80&w=300&auto=format&fit=crop');
        setInvoiceFooterMessage(data.invoiceFooterMessage || 'Thank you for supporting Local Rightnow Garments! We hope you love your premium apparel.');
        setTermsAndConditions(data.termsAndConditions || '1. Exchange within 7 days. 2. Strictly no cash refunds.');
      } else {
        // Seed default profile
        const defaultProfile: BusinessSettings = {
          id: 'business_profile',
          storeName,
          storeAddress,
          storePhone,
          storeEmail,
          storeGstin,
          upiQrUrl,
          invoiceFooterMessage,
          termsAndConditions
        };
        await setDoc(docRef, defaultProfile);
      }
    } catch (e) {
      console.error(e);
      triggerGlobalAlert('error', 'Failed to fetch business settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: BusinessSettings = {
        id: 'business_profile',
        storeName: storeName.trim(),
        storeAddress: storeAddress.trim(),
        storePhone: storePhone.trim(),
        storeEmail: storeEmail.trim(),
        storeGstin: storeGstin.trim().toUpperCase(),
        upiQrUrl: upiQrUrl.trim(),
        invoiceFooterMessage: invoiceFooterMessage.trim(),
        termsAndConditions: termsAndConditions.trim()
      };

      await setDoc(doc(db, 'settings', 'business_profile'), payload);
      triggerGlobalAlert('success', 'Corporate business profiles and GST parameters synced!');
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerGlobalAlert('error', 'Failed to save settings: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-3 border-neutral-950 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl border border-neutral-100 shadow-sm animate-fadeIn space-y-6">
      <div className="flex justify-between items-center pb-3 border-b">
        <div className="text-left">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-950">Corporate Merchant parameters</h3>
          <p className="text-[10px] text-neutral-400">Configure retail storefront, legal GSTIN, and automated BHIM UPI cash-collect QR codes.</p>
        </div>
        <button
          onClick={fetchBusinessSettings}
          className="text-orange-600 hover:text-orange-700 text-[10px] font-black uppercase flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reload settings
        </button>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 text-left">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1 flex items-center gap-1">
              <Store className="w-3.5 h-3.5" />
              Store name *
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1 flex items-center gap-1">
              <Key className="w-3.5 h-3.5" />
              Corporate GSTIN Tax ID *
            </label>
            <input
              type="text"
              required
              value={storeGstin}
              onChange={(e) => setStoreGstin(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              Showroom contact Phone *
            </label>
            <input
              type="text"
              required
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              Merchant Support Email *
            </label>
            <input
              type="email"
              required
              value={storeEmail}
              onChange={(e) => setStoreEmail(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" />
              BHIM UPI QR Code Image URL *
            </label>
            <input
              type="url"
              required
              placeholder="https://..."
              value={upiQrUrl}
              onChange={(e) => setUpiQrUrl(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Showroom Address *</label>
            <textarea
              required
              rows={2}
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
            ></textarea>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Invoice Terms & conditions *
            </label>
            <textarea
              required
              rows={2}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
            ></textarea>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Invoice Footer Greeting *</label>
            <input
              type="text"
              required
              value={invoiceFooterMessage}
              onChange={(e) => setInvoiceFooterMessage(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <div className="flex-grow text-left text-xs text-neutral-400 flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            Changes sync instantly to the checkout screen.
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-md transition-all"
          >
            {submitting ? 'Saving...' : 'Save business Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
