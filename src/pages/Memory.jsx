import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Download, Edit3, Save, X, Tag, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';

const TYPES = ['general', 'brand', 'niche', 'seo', 'technical', 'client'];
const TYPE_COLORS = {
  general: 'bg-neutral-100 text-neutral-600',
  brand: 'bg-purple-100 text-purple-700',
  niche: 'bg-blue-100 text-blue-700',
  seo: 'bg-green-100 text-green-700',
  technical: 'bg-orange-100 text-orange-700',
  client: 'bg-pink-100 text-pink-700',
};

function MemoryCard({ bucket, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: bucket.name, type: bucket.type, content: bucket.content, tags: bucket.tags?.join(', ') || '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    await onSave(bucket.id, { ...form, tags });
    setSaving(false);
    setEditing(false);
  }

  function exportMd() {
    const md = `# ${bucket.name}\n\n**Type:** ${bucket.type}\n**Tags:** ${bucket.tags?.join(', ') || 'none'}\n\n---\n\n${bucket.content}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${bucket.name.replace(/\s+/g, '-').toLowerCase()}.md`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const json = JSON.stringify({ id: bucket.id, name: bucket.name, type: bucket.type, tags: bucket.tags, content: bucket.content }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${bucket.name.replace(/\s+/g, '-').toLowerCase()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white border border-border-light rounded-2xl p-6 space-y-4">
      {editing ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="col-span-2 px-3 py-2 border border-border-light rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10" placeholder="Bucket name" />
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="px-3 py-2 border border-border-light rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/10">
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="px-3 py-2 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10" placeholder="tags, comma, separated" />
          </div>
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={10} className="w-full px-3 py-2.5 border border-border-light rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
            placeholder="Write memory content in Markdown…" />
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-ink-primary text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-4 py-2 border border-border-light text-neutral-500 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors">
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', TYPE_COLORS[bucket.type] || TYPE_COLORS.general)}>
                  {bucket.type}
                </span>
                {bucket.tags?.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                    <Tag className="h-2.5 w-2.5" />{tag}
                  </span>
                ))}
              </div>
              <h3 className="text-lg font-serif text-ink-primary">{bucket.name}</h3>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={exportMd} title="Export .md" className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-ink-primary hover:bg-neutral-100 transition-colors">
                <Download className="h-3.5 w-3.5" />
              </button>
              <button onClick={exportJson} title="Export .json" className="h-8 px-2 flex items-center justify-center rounded-lg text-neutral-400 hover:text-ink-primary hover:bg-neutral-100 transition-colors text-[10px] font-mono font-bold">
                JSON
              </button>
              <button onClick={() => setEditing(true)} className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-ink-primary hover:bg-neutral-100 transition-colors">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(bucket.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="bg-neutral-50 rounded-xl p-4 max-h-48 overflow-y-auto">
            <pre className="text-sm text-neutral-600 whitespace-pre-wrap font-sans leading-relaxed">{bucket.content || <span className="italic text-neutral-400">No content yet — click edit to add.</span>}</pre>
          </div>
          <div className="text-xs text-neutral-400">
            {bucket.content.length} chars · Updated {new Date(bucket.updated_at).toLocaleDateString()}
          </div>
        </>
      )}
    </div>
  );
}

export default function Memory() {
  const toast = useToast();
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load() }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('brain_memory').select('*').order('created_at', { ascending: false });
    if (!error) setBuckets(data || []);
    setLoading(false);
  }

  async function create() {
    const { data, error } = await supabase.from('brain_memory').insert({
      name: 'New Memory Bucket', type: 'general', content: '', tags: [],
    }).select().single();
    if (error) { toast.error('Failed to create'); return; }
    setBuckets(prev => [data, ...prev]);
    toast.success('Memory bucket created');
  }

  async function save(id, updates) {
    const { error } = await supabase.from('brain_memory').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Save failed'); return; }
    setBuckets(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    toast.success('Saved');
  }

  async function deleteBucket(id) {
    if (!confirm('Delete this memory bucket?')) return;
    await supabase.from('brain_memory').delete().eq('id', id);
    setBuckets(prev => prev.filter(b => b.id !== id));
    toast.success('Deleted');
  }

  function exportAll() {
    const json = JSON.stringify(buckets, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'brain-memory-all.json'; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = filter === 'all' ? buckets : buckets.filter(b => b.type === filter);

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Brain System</span>
            <div className="h-[1px] w-8 bg-neutral-200" />
          </div>
          <h1 className="text-6xl font-serif text-ink-primary leading-tight tracking-tight">Memory</h1>
          <p className="text-neutral-500 font-medium max-w-lg text-base leading-relaxed">
            Named knowledge buckets injected into conversations. Brand voice, niche rules, SEO constraints — anything the agents should always know.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportAll} className="flex items-center gap-2 px-4 py-2.5 border border-border-light text-neutral-600 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors">
            <Download className="h-4 w-4" /> Export All
          </button>
          <button onClick={create} className="flex items-center gap-2 px-5 py-2.5 bg-ink-primary text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors">
            <Plus className="h-4 w-4" /> New Bucket
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', ...TYPES].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize',
              filter === t ? 'bg-ink-primary text-white' : 'bg-white border border-border-light text-neutral-500 hover:bg-neutral-50')}>
            {t} {t === 'all' ? `(${buckets.length})` : `(${buckets.filter(b => b.type === t).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-neutral-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <BookOpen className="h-10 w-10 text-neutral-300" />
          <p className="text-neutral-400">No memory buckets yet. Create one to give your agents persistent context.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(b => (
            <MemoryCard key={b.id} bucket={b} onSave={save} onDelete={deleteBucket} />
          ))}
        </div>
      )}
    </div>
  );
}
