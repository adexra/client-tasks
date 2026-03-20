import { useState, useEffect } from 'react';
import { User, Shield, Building, Zap, ChevronRight, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export default function Account() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="space-y-20 animate-in fade-in duration-700 pb-20">
      <div className="space-y-6">
         <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{t('account.tag')}</span>
            <div className="h-[1px] w-8 bg-neutral-200" />
         </div>
         <h1 className="text-3xl xs:text-4xl md:text-5xl lg:text-6xl font-serif text-[var(--ink-primary)] leading-tight tracking-tight break-words">
           {t('account.title')}
         </h1>
         <p className="text-neutral-500 font-medium max-w-lg text-base leading-relaxed">
           {t('account.subtitle')}
         </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2 space-y-12">
           {/* Profile Section */}
           <div className="surface-card p-6 md:p-12">
              <div className="flex flex-col sm:flex-row sm:items-center gap-8 mb-12">
                 <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0">
                    <User className="h-10 w-10 text-neutral-300" />
                 </div>
                  <div className="space-y-1">
                     <h2 className="text-2xl sm:text-3xl font-serif text-[var(--ink-primary)]">{t('account.lead_operator')}</h2>
                     <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.2em] break-all">operator@adexra.internal</p>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                <EditorialInput label={t('account.full_identity')} value="Adexra Lead Operator" />
                 <EditorialInput label={t('account.agency_role')} value="Arquitetura de Sistemas e Execução" />
                <EditorialInput label={t('account.contact_matrix')} value="hq@adexra.com" />
                <EditorialInput label={t('account.operational_region')} value="Global / Hybrid" />
              </div>
           </div>

           {/* Security / System Access */}
           <div className="surface-card p-6 md:p-12">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-neutral-50">
                 <div className="flex items-center gap-4">
                   <Shield className="h-5 w-5 text-neutral-200" />
                   <h3 className="text-xl font-serif text-[var(--ink-primary)]">{t('account.security_protocol')}</h3>
                 </div>
                 <span className="px-4 py-1.5 bg-[var(--success-green)]/10 text-[var(--success-green)] rounded-full text-[9px] font-bold uppercase tracking-widest">{t('account.active')}</span>
              </div>
              
              <div className="divide-y divide-neutral-50">
                 <SecurityItem label={t('account.two_factor')} sub={t('account.two_factor_sub')} active />
                 <SecurityItem label={t('account.nodal_encryption')} sub={t('account.nodal_encryption_sub')} active />
                 <SecurityItem label={t('account.action_logging')} sub={t('account.action_logging_sub')} active />
              </div>
           </div>
        </div>

        <div className="space-y-12">
           {/* Language Switcher */}
           <div className="surface-card p-10 border-neutral-100">
              <div className="flex items-center gap-3 mb-8">
                 <Globe className="h-4 w-4 text-[var(--ink-secondary)]" />
                 <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{t('account.language_settings')}</h3>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-50 rounded-xl border border-neutral-100">
                  <button 
                    onClick={() => setLanguage('pt')}
                    className={cn(
                      "py-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                      language === 'pt' ? "bg-white text-black shadow-sm" : "text-neutral-300 hover:text-neutral-500"
                    )}
                  >
                    Português
                  </button>
                  <button 
                    onClick={() => setLanguage('en')}
                    className={cn(
                      "py-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                      language === 'en' ? "bg-white text-black shadow-sm" : "text-neutral-300 hover:text-neutral-500"
                    )}
                  >
                    English
                  </button>
                </div>
              </div>
           </div>

           <div className="surface-card p-10 bg-[var(--accent-sand)]/20 border-neutral-100">
              <div className="flex items-center gap-3 mb-8">
                 <Zap className="h-4 w-4 text-[var(--ink-secondary)]" />
                 <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{t('account.system_velocity')}</h3>
              </div>
              <p className="text-sm font-medium text-[var(--ink-secondary)] leading-relaxed mb-8">
                {t('account.response_latency')} <span className="text-black font-bold">12ms</span>.
              </p>
              <div className="h-1 w-full bg-white rounded-full overflow-hidden border border-neutral-100">
                 <div className="h-full bg-neutral-200 w-[85%]" />
              </div>
           </div>

           <div className="surface-card p-10">
              <div className="flex items-center gap-3 mb-8">
                 <Building className="h-4 w-4 text-neutral-200" />
                 <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{t('account.billing_profile')}</h3>
              </div>
              <div className="space-y-6">
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-neutral-300">{t('account.plan')}</span>
                     <span className="text-[var(--ink-primary)]">Execution Elite</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-neutral-300">{t('account.next_audit')}</span>
                    <span className="text-[var(--ink-primary)]">{language === 'pt' ? '1 de Abril, 2026' : 'April 1, 2026'}</span>
                 </div>
                  <button 
                    onClick={() => window.location.href = '/financials'}
                    className="w-full py-4 border border-neutral-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:bg-neutral-50 hover:text-black transition-all mt-4"
                  >
                     {t('account.financial_records')}
                  </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

const EditorialInput = ({ label, value }) => (
  <div className="space-y-3">
    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="w-full bg-white border border-neutral-100 rounded-xl px-6 py-4 text-sm font-medium text-neutral-500">
      {value}
    </div>
  </div>
);

const SecurityItem = ({ label, sub, active }) => (
  <div className="flex items-center justify-between py-6 first:pt-0 last:pb-0">
    <div className="space-y-1">
      <h4 className="text-sm font-medium text-[var(--ink-primary)]">{label}</h4>
      <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">{sub}</p>
    </div>
    <div className={cn(
      "h-6 w-11 rounded-full p-1 transition-colors duration-300",
      active ? "bg-[var(--success-green)]" : "bg-neutral-200"
    )}>
      <div className={cn(
        "h-4 w-4 bg-white rounded-full shadow-sm transition-transform duration-300",
        active ? "translate-x-5" : "translate-x-0"
      )} />
    </div>
  </div>
);
