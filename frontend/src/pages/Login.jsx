import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ArrowRight, AlertCircle, Layers } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const testAccounts = [
    {
      role: 'admin',
      user: 'admin',
      pass: 'Admin@123',
      title: 'Administrator',
      desc: 'Full CRUD, user management, order patching, analytics',
    },
    {
      role: 'manager',
      user: 'manager',
      pass: 'Manager@123',
      title: 'Operations Manager',
      desc: 'CRUD create/edit, order fulfillment updates, analytics',
    },
    {
      role: 'viewer',
      user: 'viewer',
      pass: 'Viewer@123',
      title: 'Business Analyst',
      desc: 'Read-only analytics and dataset inspection',
    }
  ];

  const handleQuickFill = (account) => {
    setUsername(account.user);
    setPassword(account.pass);
    setError('');
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (authError) {
      setError(authError.response?.data?.error?.message || authError.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center text-white mx-auto shadow-xs">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
            Sign In to Netcom
          </h1>
          <p className="text-xs text-slate-400">
            Enterprise E-Commerce Intelligence Portal
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-lg p-5 shadow-xs space-y-3.5">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Username
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(changeEvent) => setUsername(changeEvent.target.value)}
                placeholder="Enter username"
                className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 text-slate-900 text-xs rounded-md pl-8 pr-2.5 py-1.5 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(changeEvent) => setPassword(changeEvent.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-slate-400 text-slate-900 text-xs rounded-md pl-8 pr-2.5 py-1.5 outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2 rounded-md flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Quick Accounts Selection */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] font-semibold text-slate-400 text-center uppercase tracking-wider">
            RBAC Test Accounts
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {testAccounts.map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => handleQuickFill(account)}
                className={`w-full text-left p-2.5 rounded-md border transition-colors text-xs flex items-center justify-between ${
                  username === account.user
                    ? 'border-slate-900 bg-white ring-1 ring-slate-900'
                    : 'border-slate-200/80 bg-white hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900">{account.title}</span>
                    <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                      {account.role}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{account.desc}</div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                  Select
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
