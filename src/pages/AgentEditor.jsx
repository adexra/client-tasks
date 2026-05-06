import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { chatStream } from '../lib/azure';
import { ArrowLeft, Save, Trash2, Send, Bot, Code, PenTool, TrendingUp, Layout, Cpu, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';

const ICONS = ['Bot', 'Code', 'PenTool', 'TrendingUp', 'Layout', 'Brain'];
const ICON_MAP = { Brain: Cpu, Code, PenTool, TrendingUp, Layout, Bot };
const MODELS = ['gpt-4o-mini', 'gpt-4o'];
const COLORS = ['#6366f1', '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
const TYPES = ['general', 'brand', 'niche', 'seo', 'technical', 'client'];

export default function AgentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const chatBottomRef = useRef(null);

  const [agent, setAgent] = useState(null);
  const [form, setForm] = useState({ name: '', role: '', description: '', system_prompt: '', model: 'gpt-4o-mini', color: '#6366f1', icon: 'Bot' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Test chat state
  const [testMessages, setTestMessages] = useState([]);
  const [testInput, setTestInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');

  useEffect(() => { load() }, [id]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [testMessages, streamBuffer]);

  async function load() {
    const { data, error } = await supabase.from('brain_agents').select('*').eq('id', id).single();
    if (error || !data) { navigate('/agents'); return; }
    setAgent(data);
    setForm({ name: data.name, role: data.role, description: data.description || '', system_prompt: data.system_prompt, model: data.model, color: data.color, icon: data.icon });
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('brain_agents').update({ ...form, updated_at: new Date().toISOString() }).eq('id', id);
    setSaving(false);
    if (error) { toast.error('Save failed'); return; }
    toast.success('Agent saved');
    setAgent(prev => ({ ...prev, ...form }));
  }

  async function deleteAgent() {
    if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await supabase.from('brain_agents').delete().eq('id', id);
    toast.success('Agent deleted');
    navigate('/agents');
  }

  async function sendTest(e) {
    e.preventDefault();
    if (!testInput.trim() || testing) return;
    const userMsg = testInput.trim();
    setTestInput('');
    setTestMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setTesting(true);
    setStreamBuffer('');

    const messages = [
      { role: 'system', content: form.system_prompt },
      ...testMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMsg },
    ];

    let full = '';
    try {
      full = await chatStream({
        model: form.model,
        messages,
        onChunk: (delta) => setStreamBuffer(prev => prev + delta),
      });
    } catch (err) {
      toast.error(err.message);
    }
    setStreamBuffer('');
    setTestMessages(prev => [...prev, { role: 'assistant', content: full }]);
    setTesting(false);
  }

  const Icon = ICON_MAP[form.icon] || Bot;

  if (!agent) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-4">
          <Link to="/agents" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-ink-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Agents
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: form.color + '22' }}>
              <Icon className="h-6 w-6" style={{ color: form.color }} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em]">{form.role}</div>
              <h1 className="text-3xl font-serif text-ink-primary">{form.name}</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-8">
          <button onClick={deleteAgent} disabled={deleting} className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ink-primary text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* Editor panel */}
        <div className="space-y-6">
          <div className="bg-white border border-border-light rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-bold text-ink-primary uppercase tracking-[0.1em]">Identity</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-500">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-500">Role Label</label>
                <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-500">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2.5 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-500">Model</label>
                <select value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white">
                  {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-500">Icon</label>
                <select value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white">
                  {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-500">Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={cn('h-8 w-8 rounded-lg transition-all', form.color === c ? 'ring-2 ring-offset-2 ring-black scale-110' : 'hover:scale-105')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-light rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink-primary uppercase tracking-[0.1em]">System Prompt</h2>
              <span className="text-xs text-neutral-400 font-mono">{form.system_prompt.length} chars</span>
            </div>
            <textarea
              value={form.system_prompt}
              onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
              rows={18}
              className="w-full px-4 py-3 border border-border-light rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
              placeholder="You are a specialist agent at Adexra…"
            />
          </div>
        </div>

        {/* Test chat panel */}
        <div className="bg-white border border-border-light rounded-2xl flex flex-col" style={{ height: '700px' }}>
          <div className="p-5 border-b border-border-light flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink-primary uppercase tracking-[0.1em]">Test Chat</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Uses the current system prompt (unsaved changes apply)</p>
            </div>
            <button onClick={() => setTestMessages([])} className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-ink-primary transition-colors">
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {testMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: form.color + '22' }}>
                  <Icon className="h-6 w-6" style={{ color: form.color }} />
                </div>
                <p className="text-sm text-neutral-400">Send a message to test this agent's system prompt</p>
              </div>
            )}
            {testMessages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-ink-primary text-white rounded-br-sm'
                    : 'bg-neutral-100 text-ink-primary rounded-bl-sm'
                )}>
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                </div>
              </div>
            ))}
            {testing && streamBuffer && (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-neutral-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed text-ink-primary">
                  <pre className="whitespace-pre-wrap font-sans">{streamBuffer}</pre>
                </div>
              </div>
            )}
            {testing && !streamBuffer && (
              <div className="flex justify-start">
                <div className="bg-neutral-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={sendTest} className="p-4 border-t border-border-light flex gap-3">
            <input
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              disabled={testing}
              placeholder="Test this agent…"
              className="flex-1 px-4 py-2.5 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50"
            />
            <button type="submit" disabled={!testInput.trim() || testing}
              className="h-10 w-10 flex items-center justify-center bg-ink-primary text-white rounded-xl disabled:opacity-40 hover:bg-neutral-800 transition-colors">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
