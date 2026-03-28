import React, { useState, FormEvent } from 'react';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import ocbcLogo from '../assets/Logo-ocbc.png';
import skylineBg from '../assets/sg-skyline.jpg';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (username === 'admin' && password === 'ocbc2026') {
        onLogin();
      } else {
        setError('Invalid username or password.');
        setLoading(false);
      }
    }, 600);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Full-bleed skyline backdrop */}
      <img
        src={skylineBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-[#E3000F]/20" />

      {/* Subtle secondary overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-slate-900/30" />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo + branding */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-5">
            <img src={ocbcLogo} alt="OCBC" className="h-12 object-contain brightness-0 invert" />
            <div className="border-l-2 border-white/30 pl-3 text-left">
              <div className="font-black text-xl tracking-tight text-white leading-none">AI Admin</div>
              <div className="text-xs font-bold text-[#ff4d4d] uppercase tracking-widest mt-1">Suite</div>
            </div>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">
            Sign in to manage the OCBC retirement chatbot platform.
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Top edge shimmer */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent z-10" />

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-1.5"
              >
                <label className="text-sm font-bold text-white/90">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Enter username"
                  className="w-full border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E3000F]/50 focus:border-[#E3000F]/40 bg-white/10 backdrop-blur-sm transition-all placeholder:text-white/30"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-1.5"
              >
                <label className="text-sm font-bold text-white/90">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter password"
                    className="w-full border border-white/15 rounded-xl px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E3000F]/50 focus:border-[#E3000F]/40 bg-white/10 backdrop-blur-sm transition-all placeholder:text-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-red-300 bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2 text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-[#E3000F] text-white font-bold py-3 rounded-xl text-sm hover:bg-red-700 hover:shadow-[0_0_30px_rgba(227,0,15,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/30 mt-1"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Security badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="flex items-center justify-center gap-1.5 mt-6 text-white/40"
        >
          <Shield size={13} />
          <span className="text-xs">Secured with enterprise-grade encryption</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
