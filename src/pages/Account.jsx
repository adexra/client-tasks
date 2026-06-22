import { User, Shield, Building, Zap, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import PageHeader from '../components/PageHeader';

export default function Account() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      <PageHeader
        eyebrow={t('account.tag')}
        title={t('account.title')}
        description={t('account.subtitle')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2 space-y-12">
           {/* Profile Section */}
           <div className="p-6 md:p-12 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-8 mb-12">
                 <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(244,244,246,0.05)', border: '1px solid rgba(244,244,246,0.08)' }}>
                    <User className="h-10 w-10" style={{ color: 'rgba(244,244,246,0.2)' }} />
                 </div>
                  <div className="space-y-1">
                     <h2 className="text-2xl sm:text-3xl font-serif" style={{ color: '#F4F4F6' }}>{t('account.lead_operator')}</h2>
                     <p className="text-[10px] font-bold uppercase tracking-[0.2em] break-all" style={{ color: 'rgba(244,244,246,0.2)' }}>operator@adexra.internal</p>
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
           <div className="p-6 md:p-12 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
              <div className="flex items-center justify-between mb-10 pb-6" style={{ borderBottom: '1px solid rgba(244,244,246,0.07)' }}>
                 <div className="flex items-center gap-4">
                   <Shield className="h-5 w-5" style={{ color: 'rgba(244,244,246,0.15)' }} />
                   <h3 className="text-xl font-serif" style={{ color: '#F4F4F6' }}>{t('account.security_protocol')}</h3>
                 </div>
                 <span className="px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>{t('account.active')}</span>
              </div>

              <div style={{ borderTop: 'none' }}>
                 <SecurityItem label={t('account.two_factor')} sub={t('account.two_factor_sub')} active />
                 <SecurityItem label={t('account.nodal_encryption')} sub={t('account.nodal_encryption_sub')} active />
                 <SecurityItem label={t('account.action_logging')} sub={t('account.action_logging_sub')} active />
              </div>
           </div>
        </div>

        <div className="space-y-12">
           {/* Language Switcher */}
           <div className="p-10 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
              <div className="flex items-center gap-3 mb-8">
                 <Globe className="h-4 w-4" style={{ color: '#6B7080' }} />
                 <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#6B7080' }}>{t('account.language_settings')}</h3>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl" style={{ background: 'rgba(244,244,246,0.05)', border: '1px solid rgba(244,244,246,0.07)' }}>
                  <button
                    onClick={() => setLanguage('pt')}
                    className="py-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all"
                    style={language === 'pt'
                      ? { background: '#3362FF', color: '#F4F4F6' }
                      : { color: '#6B7080' }
                    }
                  >
                    Português
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className="py-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all"
                    style={language === 'en'
                      ? { background: '#3362FF', color: '#F4F4F6' }
                      : { color: '#6B7080' }
                    }
                  >
                    English
                  </button>
                </div>
              </div>
           </div>

           <div className="p-10 rounded-2xl" style={{ background: 'rgba(51,98,255,0.08)', border: '1px solid rgba(244,244,246,0.07)' }}>
              <div className="flex items-center gap-3 mb-8">
                 <Zap className="h-4 w-4" style={{ color: '#6B7080' }} />
                 <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#6B7080' }}>{t('account.system_velocity')}</h3>
              </div>
              <p className="text-sm font-medium leading-relaxed mb-8" style={{ color: '#6B7080' }}>
                {t('account.response_latency')} <span className="font-bold" style={{ color: '#F4F4F6' }}>12ms</span>.
              </p>
              <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(244,244,246,0.07)' }}>
                 <div className="h-full w-[85%]" style={{ background: '#3362FF' }} />
              </div>
           </div>

           <div className="p-10 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
              <div className="flex items-center gap-3 mb-8">
                 <Building className="h-4 w-4" style={{ color: 'rgba(244,244,246,0.15)' }} />
                 <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#6B7080' }}>{t('account.billing_profile')}</h3>
              </div>
              <div className="space-y-6">
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span style={{ color: 'rgba(244,244,246,0.2)' }}>{t('account.plan')}</span>
                    <span style={{ color: '#F4F4F6' }}>Execution Elite</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span style={{ color: 'rgba(244,244,246,0.2)' }}>{t('account.next_audit')}</span>
                    <span style={{ color: '#F4F4F6' }}>{language === 'pt' ? '1 de Abril, 2026' : 'April 1, 2026'}</span>
                 </div>
                  <button
                    onClick={() => window.location.href = '/financials'}
                    className="w-full py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all mt-4"
                    style={{ border: '1px solid rgba(244,244,246,0.1)', color: '#6B7080', background: 'transparent' }}
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
    <label className="block text-[9px] font-bold uppercase tracking-widest ml-1" style={{ color: '#6B7080' }}>{label}</label>
    <div className="w-full rounded-xl px-6 py-4 text-sm font-medium" style={{ background: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.1)', color: '#6B7080' }}>
      {value}
    </div>
  </div>
);

const SecurityItem = ({ label, sub, active }) => (
  <div className="flex items-center justify-between py-6 first:pt-0 last:pb-0" style={{ borderBottom: '1px solid rgba(244,244,246,0.05)' }}>
    <div className="space-y-1">
      <h4 className="text-sm font-medium" style={{ color: '#F4F4F6' }}>{label}</h4>
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(244,244,246,0.2)' }}>{sub}</p>
    </div>
    <div
      className="h-6 w-11 rounded-full p-1 transition-colors duration-300"
      style={{ background: active ? '#22C55E' : 'rgba(244,244,246,0.1)' }}
    >
      <div
        className="h-4 w-4 bg-white rounded-full shadow-sm transition-transform duration-300"
        style={{ transform: active ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </div>
  </div>
);
