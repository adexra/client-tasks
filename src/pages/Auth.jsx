import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { Activity, Lock, ArrowRight } from 'lucide-react';

const inp = {
  width: '100%',
  background: 'rgba(244,244,246,0.05)',
  border: '1px solid rgba(244,244,246,0.12)',
  borderRadius: '12px',
  padding: '14px 20px',
  fontSize: '14px',
  fontWeight: '500',
  color: '#F4F4F6',
  outline: 'none',
};

export default function Auth() {
  const toast = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Account created. You can now sign in.');
      }
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 px-6 lg:px-8 animate-in fade-in duration-700"
      style={{ background: '#01020E' }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center"
            style={{ background: '#3362FF', boxShadow: '0 0 40px rgba(51,98,255,0.3)' }}
          >
            <Activity className="h-6 w-6" style={{ color: '#F4F4F6' }} />
          </div>
        </div>

        <h2
          className="text-center text-4xl font-serif tracking-tight"
          style={{ color: '#F4F4F6' }}
        >
          {isLogin ? 'Welcome back.' : 'Create account.'}
        </h2>
        <p
          className="mt-3 text-center text-sm font-medium max-w-sm mx-auto leading-relaxed"
          style={{ color: '#6B7080' }}
        >
          {isLogin
            ? 'Sign in to access your operational command center.'
            : 'Register to access your execution platform.'}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[440px]">
        <div
          className="py-10 px-8 sm:px-12 rounded-[2rem] animate-in zoom-in-95 duration-500"
          style={{
            background: '#0D0F1E',
            border: '1px solid rgba(244,244,246,0.07)',
          }}
        >
          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="space-y-2">
              <label
                className="block text-[10px] font-bold uppercase tracking-widest ml-1"
                style={{ color: '#6B7080' }}
              >
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={inp}
                onFocus={e => { e.target.style.borderColor = 'rgba(51,98,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(51,98,255,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(244,244,246,0.12)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="block text-[10px] font-bold uppercase tracking-widest ml-1"
                  style={{ color: '#6B7080' }}
                >
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    className="text-[10px] font-bold uppercase tracking-widest transition-colors"
                    style={{ color: '#6B7080' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#F4F4F6'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: '#6B7080' }}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inp, paddingLeft: '44px' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(51,98,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(51,98,255,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(244,244,246,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2.5 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                style={{
                  background: loading ? 'rgba(51,98,255,0.4)' : '#3362FF',
                  color: '#F4F4F6',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  border: 'none',
                }}
              >
                {loading ? 'Processing...' : isLogin ? 'Sign in securely' : 'Create account'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid rgba(244,244,246,0.07)' }} />
              </div>
              <div className="relative flex justify-center">
                <span
                  className="px-4 text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: '#0D0F1E', color: '#6B7080' }}
                >
                  or
                </span>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-[11px] font-bold uppercase tracking-widest transition-colors"
                style={{ color: '#6B7080' }}
                onMouseEnter={e => e.currentTarget.style.color = '#F4F4F6'}
                onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}
              >
                {isLogin ? "Don't have a login? Register" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
