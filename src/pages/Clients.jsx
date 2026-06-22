import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Building2,
  Search,
  Filter,
  ChevronRight,
  Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import TagBadge from '../components/TagBadge';
import { useLanguage } from '../context/LanguageContext';
import PageHeader from '../components/PageHeader';

export default function Clients() {
  const { t, language } = useLanguage();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      if (!error) setClients(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <PageHeader
        eyebrow={t('portfolio.tag')}
        title={t('portfolio.title')}
        description={t('portfolio.subtitle')}
      />

      <div className="flex flex-col sm:flex-row items-center gap-6">
           <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors" style={{ color: 'rgba(244,244,246,0.2)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('portfolio.search_placeholder')}
                className="w-full rounded-xl pl-12 pr-6 py-4 text-sm font-medium focus:outline-none transition-all"
                style={{
                  background: 'rgba(244,244,246,0.04)',
                  border: '1px solid rgba(244,244,246,0.1)',
                  color: '#F4F4F6',
                }}
              />
           </div>

           <div className="flex p-1 rounded-xl w-full sm:w-auto" style={{ background: 'rgba(244,244,246,0.06)' }}>
              {['all', 'active', 'archived'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex-1 sm:flex-none transition-all"
                  style={filter === f
                    ? { background: '#3362FF', color: '#F4F4F6' }
                    : { color: '#6B7080' }
                  }
                >
                  {f === 'all' ? t('portfolio.filter_all').toUpperCase() :
                   f === 'active' ? t('portfolio.filter_active').toUpperCase() :
                   t('portfolio.filter_archived').toUpperCase()}
                </button>
              ))}
           </div>
        </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-6" style={{ color: 'rgba(244,244,246,0.15)' }}>
           <div className="h-1 w-20 overflow-hidden relative" style={{ background: 'rgba(244,244,246,0.07)' }}>
              <div className="absolute inset-y-0 left-0 w-1/2 animate-[shimmer_2s_infinite]" style={{ background: 'rgba(244,244,246,0.2)' }} />
           </div>
           <p className="text-[10px] font-bold uppercase tracking-[0.4em] italic">{t('portfolio.loading_records')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
           {filtered.map(client => (
             <Link key={client.id} to={`/client/${client.id}`} className="group block">
                <div className="h-full flex flex-col transition-all rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
                   <div className="p-10 flex-1 space-y-8">
                      <div className="flex justify-between items-start">
                         <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-colors" style={{ background: 'rgba(244,244,246,0.05)', border: '1px solid rgba(244,244,246,0.07)' }}>
                            <Briefcase className="h-5 w-5 transition-colors" style={{ color: 'rgba(244,244,246,0.2)' }} />
                         </div>
                         <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-all" style={{ color: 'rgba(244,244,246,0.1)' }} />
                      </div>

                      <div className="space-y-2">
                         <h3 className="text-2xl font-serif transition-colors" style={{ color: '#F4F4F6' }}>{client.name}</h3>
                         {client.contact_link && (
                           <a
                             href={client.contact_link.startsWith('http') ? client.contact_link : `https://${client.contact_link}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="inline-block text-[10px] font-bold hover:underline uppercase tracking-widest mt-1"
                             style={{ color: '#3362FF' }}
                             onClick={(e) => e.stopPropagation()}
                           >
                             {t('portfolio.contact_me')}
                           </a>
                         )}
                         <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed" style={{ color: 'rgba(244,244,246,0.2)' }}>
                           {client.email || t('portfolio.contact_registered')}
                         </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                         {client.tags?.slice(0, 3).map(t => <TagBadge key={t} tag={t} />)}
                      </div>
                   </div>

                   <div className="px-10 py-6 flex items-center justify-between" style={{ borderTop: '1px solid rgba(244,244,246,0.07)' }}>
                      <div className="flex items-center gap-2">
                         <div className={cn("h-1.5 w-1.5 rounded-full")} style={{ background: client.status === 'active' ? '#22C55E' : 'rgba(244,244,246,0.2)' }} />
                         <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(244,244,246,0.2)' }}>
                           {client.status === 'active' ? t('portfolio.filter_active') : t('portfolio.filter_archived')}
                         </span>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] font-medium mb-0.5" style={{ color: 'rgba(244,244,246,0.15)' }}>{t('portfolio.created_at')} {new Date(client.created_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}</p>
                         <span className="text-[9px] font-medium tabular-nums" style={{ color: 'rgba(244,244,246,0.2)' }}>Ref. {client.id.split('-')[0].toUpperCase()}</span>
                      </div>
                   </div>
                </div>
             </Link>
           ))}

           {filtered.length === 0 && (
              <div className="col-span-full py-32 rounded-[40px] flex flex-col items-center justify-center" style={{ border: '2px dashed rgba(244,244,246,0.1)', color: 'rgba(244,244,246,0.15)' }}>
                 <Filter className="h-10 w-10 mb-6" />
                 <p className="text-[10px] font-bold uppercase tracking-[0.4em] italic" style={{ color: 'rgba(244,244,246,0.2)' }}>{t('portfolio.no_results')}</p>
              </div>
           )}
        </div>
      )}
    </div>
  );
}
