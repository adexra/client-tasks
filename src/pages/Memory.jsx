import { useState, useEffect } from 'react';
import CustomSelect from '../components/CustomSelect';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Download, Edit3, Save, X, Tag, BookOpen } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';

const TYPES = ['general', 'brand', 'niche', 'seo', 'technical', 'client'];

const TYPE_COLORS = {
  general:   { bg: 'rgba(107,112,128,0.15)', color: '#9CA3AF' },
  brand:     { bg: 'rgba(139,92,246,0.15)',  color: '#a78bfa' },
  niche:     { bg: 'rgba(51,98,255,0.15)',   color: '#818cf8' },
  seo:       { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
  technical: { bg: 'rgba(251,146,60,0.15)',  color: '#fb923c' },
  client:    { bg: 'rgba(236,72,153,0.15)',  color: '#f472b6' },
};

const card = {
  background: '#0D0F1E',
  border: '1px solid rgba(244,244,246,0.08)',
  borderRadius: '16px',
  padding: '24px',
};

const di = {
  width: '100%',
  background: 'rgba(244,244,246,0.05)',
  border: '1px solid rgba(244,244,246,0.12)',
  borderRadius: '12px',
  padding: '10px 14px',
  fontSize: '14px',
  color: '#F4F4F6',
  outline: 'none',
};

const ds = { ...di, cursor: 'pointer' };

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

  const tc = TYPE_COLORS[bucket.type] || TYPE_COLORS.general;

  const iconBtn = {
    height: '32px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: 'none', borderRadius: '8px', color: '#6B7080', cursor: 'pointer',
  };

  return (
    <div style={card}>
      {editing ? (
        <div className="space-y-3">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={{ ...di, gridColumn: '1 / -1' }} placeholder="Bucket name"
              onFocus={e => e.target.style.borderColor = 'rgba(51,98,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(244,244,246,0.12)'} />
            <CustomSelect value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} options={TYPES.map(t => ({ value: t, label: t }))} />
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              style={di} placeholder="tags, comma, separated"
              onFocus={e => e.target.style.borderColor = 'rgba(51,98,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(244,244,246,0.12)'} />
          </div>
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={10} style={{ ...di, resize: 'none', lineHeight: '1.6', fontFamily: 'monospace' }}
            placeholder="Write memory content in Markdown…"
            onFocus={e => e.target.style.borderColor = 'rgba(51,98,255,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(244,244,246,0.12)'} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={save} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#3362FF', color: '#F4F4F6', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'transparent', color: '#6B7080', border: '1px solid rgba(244,244,246,0.12)', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span style={{ background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {bucket.type}
                </span>
                {bucket.tags?.map(tag => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(244,244,246,0.06)', color: '#6B7080', padding: '2px 8px', borderRadius: '99px', fontSize: '10px' }}>
                    <Tag className="h-2.5 w-2.5" />{tag}
                  </span>
                ))}
              </div>
              <h3 style={{ fontSize: '18px', fontFamily: 'serif', color: '#F4F4F6', margin: 0 }}>{bucket.name}</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button onClick={exportMd} title="Export .md" style={iconBtn}
                onMouseEnter={e => { e.currentTarget.style.color = '#F4F4F6'; e.currentTarget.style.background = 'rgba(244,244,246,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B7080'; e.currentTarget.style.background = 'transparent'; }}>
                <Download className="h-3.5 w-3.5" />
              </button>
              <button onClick={exportJson} title="Export .json"
                style={{ ...iconBtn, width: 'auto', padding: '0 8px', fontSize: '10px', fontFamily: 'monospace', fontWeight: '700' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F4F4F6'; e.currentTarget.style.background = 'rgba(244,244,246,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B7080'; e.currentTarget.style.background = 'transparent'; }}>
                JSON
              </button>
              <button onClick={() => setEditing(true)} style={iconBtn}
                onMouseEnter={e => { e.currentTarget.style.color = '#F4F4F6'; e.currentTarget.style.background = 'rgba(244,244,246,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B7080'; e.currentTarget.style.background = 'transparent'; }}>
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(bucket.id)} style={iconBtn}
                onMouseEnter={e => { e.currentTarget.style.color = '#FF3B5C'; e.currentTarget.style.background = 'rgba(255,59,92,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B7080'; e.currentTarget.style.background = 'transparent'; }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div style={{ background: 'rgba(244,244,246,0.03)', borderRadius: '12px', padding: '16px', maxHeight: '192px', overflowY: 'auto', marginBottom: '12px' }}>
            <pre style={{ fontSize: '14px', color: '#9CA3AF', whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', lineHeight: '1.6', margin: 0 }}>
              {bucket.content || <span style={{ fontStyle: 'italic', color: '#6B7080' }}>No content yet — click edit to add.</span>}
            </pre>
          </div>
          <div style={{ fontSize: '12px', color: '#6B7080' }}>
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

  function filterBtnStyle(t) {
    return {
      padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
      textTransform: 'capitalize', transition: 'all 0.15s',
      ...(filter === t
        ? { background: '#3362FF', color: '#F4F4F6', border: 'none' }
        : { background: 'transparent', color: '#6B7080', border: '1px solid rgba(244,244,246,0.12)' }),
    };
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <PageHeader
        eyebrow="Brain System"
        title="Memory"
        description="Named knowledge buckets injected into conversations. Brand voice, niche rules, SEO constraints."
        actions={
          <>
            <button onClick={exportAll}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: 'transparent', color: '#6B7080', border: '1px solid rgba(244,244,246,0.12)', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              <Download className="h-3.5 w-3.5" /> Export All
            </button>
            <button onClick={create}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#3362FF', color: '#F4F4F6', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              <Plus className="h-3.5 w-3.5" /> New Bucket
            </button>
          </>
        }
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {['all', ...TYPES].map(t => (
          <button key={t} onClick={() => setFilter(t)} style={filterBtnStyle(t)}>
            {t} {t === 'all' ? `(${buckets.length})` : `(${buckets.filter(b => b.type === t).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} style={{ height: '192px', borderRadius: '16px', background: 'rgba(244,244,246,0.03)' }} className="animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0', gap: '16px', textAlign: 'center' }}>
          <BookOpen style={{ width: '40px', height: '40px', color: '#6B7080' }} />
          <p style={{ color: '#6B7080', margin: 0 }}>No memory buckets yet. Create one to give your agents persistent context.</p>
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
