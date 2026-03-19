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

export default function Clients() {
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
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Project Directory</span>
              <div className="h-[1px] w-8 bg-neutral-200" />
           </div>
           <h1 className="text-6xl font-serif text-[var(--ink-primary)] leading-tight tracking-tight">
             Portfolio.
           </h1>
           <p className="text-neutral-500 font-medium max-w-lg text-base leading-relaxed">
             Detailed records of all active and completed projects 
             under Adexra management.
           </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-6">
           <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300 group-focus-within:text-black transition-colors" />
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full bg-white border border-neutral-100 rounded-xl pl-12 pr-6 py-4 text-sm font-medium text-[var(--ink-primary)] placeholder:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-200 transition-all"
              />
           </div>
           
           <div className="flex bg-neutral-100 p-1 rounded-xl w-full sm:w-auto">
              {['all', 'active', 'archived'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex-1 sm:flex-none transition-all",
                    filter === f ? "bg-white text-[var(--ink-primary)] shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  {f}
                </button>
              ))}
           </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-6 text-neutral-200">
           <div className="h-1 w-20 bg-neutral-100 overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 bg-neutral-300 w-1/2 animate-[shimmer_2s_infinite]" />
           </div>
           <p className="text-[10px] font-bold uppercase tracking-[0.4em] italic">Loading records...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
           {filtered.map(client => (
             <Link key={client.id} to={`/client/${client.id}`} className="group block">
                <div className="surface-card surface-card-hover h-full flex flex-col transition-all">
                   <div className="p-10 flex-1 space-y-8">
                      <div className="flex justify-between items-start">
                         <div className="h-12 w-12 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center group-hover:bg-neutral-100 transition-colors">
                            <Briefcase className="h-5 w-5 text-neutral-300 group-hover:text-black transition-colors" />
                         </div>
                         <ChevronRight className="h-4 w-4 text-neutral-100 group-hover:text-neutral-300 group-hover:translate-x-1 transition-all" />
                      </div>
                      
                      <div className="space-y-2">
                         <h3 className="text-2xl font-serif text-[var(--ink-primary)] group-hover:text-black transition-colors">{client.name}</h3>
                         <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest leading-relaxed">
                           {client.email || 'Contact recorded'}
                         </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                         {client.tags?.slice(0, 3).map(t => <TagBadge key={t} tag={t} />)}
                      </div>
                   </div>

                   <div className="px-10 py-6 border-t border-neutral-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className={cn("h-1.5 w-1.5 rounded-full", client.status === 'active' ? "bg-[var(--success-green)]" : "bg-neutral-200")} />
                         <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">{client.status}</span>
                      </div>
                      <span className="text-[9px] font-medium text-neutral-200 tabular-nums">Ref. {client.id.split('-')[0].toUpperCase()}</span>
                   </div>
                </div>
             </Link>
           ))}

           {filtered.length === 0 && (
              <div className="col-span-full py-32 border-2 border-dashed border-neutral-100 rounded-[40px] flex flex-col items-center justify-center text-neutral-200">
                 <Filter className="h-10 w-10 mb-6" />
                 <p className="text-[10px] font-bold uppercase tracking-[0.4em] italic text-neutral-300">No matching records found.</p>
              </div>
           )}
        </div>
      )}
    </div>
  );
}
