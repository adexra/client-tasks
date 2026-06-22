import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getEmbedding } from '../lib/azure';
import { Plus, Trash2, Download, Edit3, Save, X, Tag, Database, Loader, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const STATUS_ICONS = {
  pending:    <div style={{ height: '14px', width: '14px', borderRadius: '99px', background: 'rgba(244,244,246,0.2)' }} />,
  processing: <Loader style={{ width: '14px', height: '14px', color: '#3362FF' }} className="animate-spin" />,
  done:       <CheckCircle2 style={{ width: '14px', height: '14px', color: '#22C55E' }} />,
  error:      <AlertCircle style={{ width: '14px', height: '14px', color: '#FF3B5C' }} />,
};

function chunkText(text, size = 500, overlap = 80) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return chunks;
}

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

function RAGCard({ doc, onSave, onDelete, onEmbed }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: doc.title, content: doc.content, tags: doc.tags?.join(', ') || '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    await onSave(doc.id, { ...form, tags, embedding_status: 'pending', chunks: [] });
    setSaving(false);
    setEditing(false);
  }

  function exportMd() {
    const md = `# ${doc.title}\n\n**Tags:** ${doc.tags?.join(', ') || 'none'}\n\n---\n\n${doc.content}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${doc.title.replace(/\s+/g, '-').toLowerCase()}.md`; a.click();
    URL.revokeObjectURL(url);
  }

  const iconBtn = {
    height: '32px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: 'none', borderRadius: '8px', color: '#6B7080', cursor: 'pointer',
  };

  return (
    <div style={card}>
      {editing ? (
        <div className="space-y-3">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            style={di} placeholder="Document title"
            onFocus={e => e.target.style.borderColor = 'rgba(51,98,255,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(244,244,246,0.12)'} />
          <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            style={di} placeholder="tags, comma, separated"
            onFocus={e => e.target.style.borderColor = 'rgba(51,98,255,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(244,244,246,0.12)'} />
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={14} style={{ ...di, resize: 'none', lineHeight: '1.6', fontFamily: 'monospace' }}
            placeholder="Paste the full document content here…"
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {STATUS_ICONS[doc.embedding_status] || STATUS_ICONS.pending}
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#6B7080' }}>{doc.embedding_status}</span>
                </div>
                {doc.embedding_status === 'done' && (
                  <span style={{ fontSize: '10px', color: '#22C55E', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '99px' }}>
                    {Array.isArray(doc.chunks) ? doc.chunks.length : 0} chunks
                  </span>
                )}
                {doc.tags?.map(tag => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(244,244,246,0.06)', color: '#6B7080', padding: '2px 8px', borderRadius: '99px', fontSize: '10px' }}>
                    <Tag className="h-2.5 w-2.5" />{tag}
                  </span>
                ))}
              </div>
              <h3 style={{ fontSize: '18px', fontFamily: 'serif', color: '#F4F4F6', margin: 0 }}>{doc.title}</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {doc.embedding_status !== 'done' && (
                <button onClick={() => onEmbed(doc)}
                  style={{ height: '32px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '500', color: '#3362FF', background: 'rgba(51,98,255,0.12)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,98,255,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(51,98,255,0.12)'}>
                  <Database className="h-3 w-3" /> Embed
                </button>
              )}
              <button onClick={exportMd} title="Export .md" style={iconBtn}
                onMouseEnter={e => { e.currentTarget.style.color = '#F4F4F6'; e.currentTarget.style.background = 'rgba(244,244,246,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B7080'; e.currentTarget.style.background = 'transparent'; }}>
                <Download className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditing(true)} style={iconBtn}
                onMouseEnter={e => { e.currentTarget.style.color = '#F4F4F6'; e.currentTarget.style.background = 'rgba(244,244,246,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B7080'; e.currentTarget.style.background = 'transparent'; }}>
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(doc.id)} style={iconBtn}
                onMouseEnter={e => { e.currentTarget.style.color = '#FF3B5C'; e.currentTarget.style.background = 'rgba(255,59,92,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B7080'; e.currentTarget.style.background = 'transparent'; }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div style={{ background: 'rgba(244,244,246,0.03)', borderRadius: '12px', padding: '16px', maxHeight: '160px', overflowY: 'auto', marginBottom: '12px' }}>
            <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: '1.6', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
              {doc.content || <span style={{ fontStyle: 'italic', color: '#6B7080' }}>No content yet.</span>}
            </p>
          </div>
          <div style={{ fontSize: '12px', color: '#6B7080' }}>
            {doc.content?.length || 0} chars · Updated {new Date(doc.updated_at).toLocaleDateString()}
          </div>
        </>
      )}
    </div>
  );
}

export default function RAG() {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load() }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('brain_rag').select('*').order('created_at', { ascending: false });
    if (!error) setDocs(data || []);
    setLoading(false);
  }

  async function create() {
    const { data, error } = await supabase.from('brain_rag').insert({
      title: 'New Document', content: '', tags: [], chunks: [], embedding_status: 'pending',
    }).select().single();
    if (error) { toast.error('Failed to create'); return; }
    setDocs(prev => [data, ...prev]);
  }

  async function save(id, updates) {
    const { error } = await supabase.from('brain_rag').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Save failed'); return; }
    setDocs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    toast.success('Saved');
  }

  async function deleteDoc(id) {
    if (!confirm('Delete this document?')) return;
    await supabase.from('brain_rag').delete().eq('id', id);
    setDocs(prev => prev.filter(d => d.id !== id));
    toast.success('Deleted');
  }

  async function embedDoc(doc) {
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, embedding_status: 'processing' } : d));
    try {
      const rawChunks = chunkText(doc.content);
      const chunks = [];
      for (const text of rawChunks) {
        const embedding = await getEmbedding(text);
        chunks.push({ text, embedding });
      }
      const { error } = await supabase.from('brain_rag').update({
        chunks, embedding_status: 'done', updated_at: new Date().toISOString(),
      }).eq('id', doc.id);
      if (error) throw error;
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, chunks, embedding_status: 'done' } : d));
      toast.success(`Embedded ${chunks.length} chunks`);
    } catch (err) {
      await supabase.from('brain_rag').update({ embedding_status: 'error' }).eq('id', doc.id);
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, embedding_status: 'error' } : d));
      toast.error(`Embedding failed: ${err.message}`);
    }
  }

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#6B7080', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Brain System</span>
            <div style={{ height: '1px', width: '32px', background: 'rgba(244,244,246,0.1)' }} />
          </div>
          <h1 style={{ fontSize: '60px', fontFamily: 'serif', color: '#F4F4F6', lineHeight: '1.1', margin: 0 }}>RAG Documents</h1>
          <p style={{ color: '#6B7080', fontSize: '16px', lineHeight: '1.6', maxWidth: '480px', margin: 0 }}>
            Long-form documents embedded for semantic retrieval. Competitor research, transcripts, brand guides — paste and embed.
          </p>
        </div>
        <button onClick={create}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#3362FF', color: '#F4F4F6', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
          <Plus className="h-4 w-4" /> New Document
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} style={{ height: '192px', borderRadius: '16px', background: 'rgba(244,244,246,0.03)' }} className="animate-pulse" />)}
        </div>
      ) : docs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0', gap: '16px', textAlign: 'center' }}>
          <Database style={{ width: '40px', height: '40px', color: '#6B7080' }} />
          <p style={{ color: '#6B7080', margin: 0 }}>No RAG documents yet. Add a document and click Embed to make it searchable.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {docs.map(d => (
            <RAGCard key={d.id} doc={d} onSave={save} onDelete={deleteDoc} onEmbed={embedDoc} />
          ))}
        </div>
      )}
    </div>
  );
}
