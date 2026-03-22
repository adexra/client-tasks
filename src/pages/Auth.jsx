import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Activity, Lock, ArrowRight } from 'lucide-react';

export default function Auth() {
  const { t } = useLanguage();
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
        toast.success("Account created successfully. You can now log in.");
      }
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 px-6 lg:px-8 font-sans selection:bg-[var(--accent-sand)] selection:text-black">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="flex justify-center mb-8">
          <div className="h-14 w-14 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/10">
            <Activity className="h-6 w-6 text-white" />
          </div>
        </div>

        <h2 className="text-center text-4xl font-serif text-[var(--ink-primary)] tracking-tight">
          {isLogin ? 'Welcome back.' : 'Create your sandbox.'}
        </h2>
        <p className="mt-3 text-center text-sm font-medium text-neutral-500 max-w-sm mx-auto">
          {isLogin 
            ? 'Sign in to access your projects and operational intelligence.'
            : 'Register a new account to explore this portfolio in a secure, isolated environment.'}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[440px] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 fill-mode-both">
        <div className="bg-white py-10 px-8 sm:px-12 shadow-2xl shadow-neutral-200/50 rounded-[2rem] border border-neutral-100/60 transition-all">
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-50/50 border border-neutral-100 rounded-xl px-5 py-3.5 text-sm font-medium focus:outline-none focus:border-neutral-300 focus:ring-4 focus:ring-neutral-100/50 transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                 <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Password</label>
                 {isLogin && (
                   <button type="button" className="text-[10px] font-bold text-neutral-300 hover:text-neutral-500 transition-colors uppercase tracking-widest">
                     Forgot?
                   </button>
                 )}
              </div>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-neutral-300" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-50/50 border border-neutral-100 rounded-xl pl-12 pr-5 py-3.5 text-sm font-medium focus:outline-none focus:border-neutral-300 focus:ring-4 focus:ring-neutral-100/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold uppercase tracking-widest text-white bg-black hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : isLogin ? 'Sign in securely' : 'Create Sandbox'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-100" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-[10px] font-bold text-neutral-300 uppercase tracking-widest">or</span>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-[var(--ink-primary)] transition-colors"
              >
                {isLogin ? "Don't have a login? Register" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
