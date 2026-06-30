import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { X, Mail, Lock, User, Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError('Name is required');
          setLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMsg('Account created successfully! Welcome to Rightnow Garments.');
        setTimeout(() => {
          onLoginSuccess(email);
          onClose();
        }, 1500);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg('Welcome back!');
        setTimeout(() => {
          onLoginSuccess(email);
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user && result.user.email) {
        onLoginSuccess(result.user.email);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdmin = () => {
    setEmail('adyah2310@gmail.com');
    setPassword('admin123');
    setIsSignUp(false);
  };

  const handleDemoCustomer = () => {
    setEmail('customer@gmail.com');
    setPassword('customer123');
    setIsSignUp(false);
  };

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        id="auth-modal-container"
        className="bg-white text-neutral-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-neutral-100 transition-all transform duration-300 relative scale-100 flex flex-col max-h-[90vh]"
      >
        {/* Top design accent */}
        <div className="h-2 bg-gradient-to-r from-orange-500 via-neutral-950 to-orange-600 w-full"></div>

        {/* Close Button */}
        <button 
          id="auth-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 transition-colors p-1 bg-neutral-100 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 overflow-y-auto">
          {/* Brand Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black tracking-tighter uppercase text-neutral-950 flex items-center justify-center gap-1">
              RIGHTNOW <span className="text-orange-500">GARMENTS</span>
            </h2>
            <p className="text-sm text-neutral-500 mt-1">Premium Men's Clothing Store • Tiruchirappalli</p>
          </div>

          <div className="flex border-b border-neutral-100 mb-6">
            <button
              id="tab-login"
              className={`flex-1 pb-3 text-center font-bold text-sm border-b-2 transition-all ${
                !isSignUp ? 'border-neutral-950 text-neutral-950' : 'border-transparent text-neutral-400 hover:text-neutral-600'
              }`}
              onClick={() => { setIsSignUp(false); setError(''); }}
            >
              Log In
            </button>
            <button
              id="tab-signup"
              className={`flex-1 pb-3 text-center font-bold text-sm border-b-2 transition-all ${
                isSignUp ? 'border-neutral-950 text-neutral-950' : 'border-transparent text-neutral-400 hover:text-neutral-600'
              }`}
              onClick={() => { setIsSignUp(true); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div id="auth-error-container" className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg flex items-start gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div id="auth-success-container" className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded-r-lg flex items-center gap-2 text-sm">
              <Sparkles className="w-5 h-5 shrink-0 text-emerald-500 animate-bounce" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-500 mb-1.5">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    id="auth-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-500 mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-500 mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-950 hover:bg-neutral-800 text-white py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-70 mt-6"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isSignUp ? 'Create Premium Account' : 'Log In to Rightnow'}
            </button>
          </form>

          {/* Social login partition */}
          <div className="relative my-6 text-center">
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b border-neutral-100"></span>
            <span className="relative bg-white px-4 text-xs uppercase font-bold text-neutral-400 tracking-wider">
              Or Connect With
            </span>
          </div>

          {/* Google Sign-in */}
          <button
            id="auth-google-btn"
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full border border-neutral-200 hover:bg-neutral-50 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.13-.67-.18-1.36-.18-2.09z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>

          {/* Quick Demo Mode */}
          <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-xl">
            <p className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-2 text-center">
              Testing & Evaluation Credentials
            </p>
            <p className="text-[11px] text-orange-700 mb-3 text-center">
              Easily evaluate both access controls by clicking the fast-fill presets below:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="demo-admin-btn"
                type="button"
                onClick={handleDemoAdmin}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2 px-1 rounded transition-colors text-center"
              >
                Set Admin Email
              </button>
              <button
                id="demo-customer-btn"
                type="button"
                onClick={handleDemoCustomer}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-2 px-1 rounded transition-colors text-center"
              >
                Set Customer Email
              </button>
            </div>
            {!isSignUp && email && (
              <p className="text-[10px] text-neutral-500 mt-2 text-center">
                Click <strong>"Log In to Rightnow"</strong> after selecting to log in.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
