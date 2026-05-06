import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getEmbedding } from '../lib/azure';
import { Plus, Trash2, Download, Edit3, Save, X, Tag, Database, Loader, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';

const STATUS_ICONS = {
  pending: <div className="h-3.5 w-3.5 rounded-full bg-neutral-300" />,
  processing: <Loader className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
  done: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  error: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
};

// Chunk text into ~500 char segments with overlap
function chunkText(text, size = 500, overlap = 80) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return chunks;
}

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

  return (
    <div className="bg-white border border-border-light rounded-2xl p-6 space-y-4">
      {editing ? (
        <>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2 border border-border-light rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10" placeholder="Document title" />
          <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            className="w-full px-3 py-2 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10" placeholder="tags, comma, separated" />
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={14} className="w-full px-3 py-2.5 border border-border-light rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
            placeholder="Paste the full document content here…" />
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
                <div className="flex items-center gap-1.5">
                  {STATUS_ICONS[doc.embedding_status] || STATUS_ICONS.pending}
                  <span className="text-[10px] font-mono text-neutral-400">{doc.embedding_status}</span>
                </div>
                {doc.embedding_status === 'done' && (
                  <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    {Array.isArray(doc.chunks) ? doc.chunks.length : 0} chunks
                  </span>
                )}
                {doc.tags?.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                    <Tag className="h-2.5 w-2.5" />{tag}
                  </span>
                ))}
              </div>
              <h3 className="text-lg font-serif text-ink-primary">{doc.title}</h3>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {doc.embedding_status !== 'done' && (
                <button onClick={() => onEmbed(doc)} className="h-8 px-2.5 flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <Database className="h-3 w-3" /> Embed
                </button>
              )}
              <button onClick={exportMd} title="Export .md" className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-ink-primary hover:bg-neutral-100 transition-colors">
                <Download className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditing(true)} className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-ink-primary hover:bg-neutral-100 transition-colors">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(doc.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="bg-neutral-50 rounded-xl p-4 max-h-40 overflow-y-auto">
            <p className="text-sm text-neutral-600 leading-relaxed line-clamp-5">{doc.content || <span className="italic text-neutral-400">No content yet.</span>}</p>
          </div>
          <div className="text-xs text-neutral-400">
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
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Brain System</span>
            <div className="h-[1px] w-8 bg-neutral-200" />
          </div>
          <h1 className="text-6xl font-serif text-ink-primary leading-tight tracking-tight">RAG Documents</h1>
          <p className="text-neutral-500 font-medium max-w-lg text-base leading-relaxed">
            Long-form documents embedded for semantic retrieval. Competitor research, transcripts, brand guides — paste and embed.
          </p>
        </div>
        <button onClick={create} className="flex items-center gap-2 px-5 py-2.5 bg-ink-primary text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors">
          <Plus className="h-4 w-4" /> New Document
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-neutral-100 animate-pulse" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Database className="h-10 w-10 text-neutral-300" />
          <p className="text-neutral-400">No RAG documents yet. Add a document and click Embed to make it searchable.</p>
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
