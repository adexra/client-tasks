import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { chatStream } from '../lib/azure';
import { ArrowLeft, Save, Trash2, Send, Bot, Code, PenTool, TrendingUp, Layout, Cpu, RotateCcw } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const ICONS = ['Bot', 'Code', 'PenTool', 'TrendingUp', 'Layout', 'Brain'];
const ICON_MAP = { Brain: Cpu, Code, PenTool, TrendingUp, Layout, Bot };
const MODELS = ['gpt-4o-mini', 'gpt-4o'];
const COLORS = ['#6366f1', '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
const TYPES = ['general', 'brand', 'niche', 'seo', 'technical', 'client'];

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

const panelCard = {
  background: '#0D0F1E',
  border: '1px solid rgba(244,244,246,0.08)',
  borderRadius: '16px',
  padding: '24px',
};

function DLabel({ children }) {
  return <label style={{ fontSize: '12px', fontWeight: '500', color: '#6B7080', display: 'block', marginBottom: '8px' }}>{children}</label>;
}

export default function AgentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const chatBottomRef = useRef(null);

  const [agent, setAgent] = useState(null);
  const [form, setForm] = useState({ name: '', role: '', description: '', system_prompt: '', model: 'gpt-4o-mini', color: '#6366f1', icon: 'Bot' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
      <div style={{ height: '24px', width: '24px', border: '2px solid rgba(244,244,246,0.2)', borderTopColor: '#3362FF', borderRadius: '99px' }} className="animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
        <div className="space-y-4">
          <Link to="/agents" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6B7080', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#F4F4F6'}
            onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}>
            <ArrowLeft className="h-4 w-4" /> All Agents
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ height: '48px', width: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: form.color + '22' }}>
              <Icon style={{ width: '24px', height: '24px', color: form.color }} />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#6B7080', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{form.role}</div>
              <h1 style={{ fontSize: '30px', fontFamily: 'serif', color: '#F4F4F6', margin: 0 }}>{form.name}</h1>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '32px' }}>
          <button onClick={deleteAgent} disabled={deleting}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'transparent', color: '#FF3B5C', border: '1px solid rgba(255,59,92,0.3)', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1 }}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <button onClick={save} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#3362FF', color: '#F4F4F6', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* Editor panel */}
        <div className="space-y-6">
          <div style={panelCard}>
            <h2 style={{ fontSize: '12px', fontWeight: '700', color: '#F4F4F6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>Identity</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <DLabel>Name</DLabel>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={di}
                  onFocus={e => e.target.style.borderColor = 'rgba(51,98,255,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(244,244,246,0.12)'} />
              </div>
              <div>
                <DLabel>Role Label</DLabel>
                <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={di}
                  onFocus={e => e.target.style.borderColor = 'rgba(51,98,255,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(244,244,246,0.12)'} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <DLabel>Description</DLabel>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={di}
                onFocus={e => e.target.style.borderColor = 'rgba(51,98,255,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(244,244,246,0.12)'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <DLabel>Model</DLabel>
                <select value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} style={ds}>
                  {MODELS.map(m => <option key={m} value={m} style={{ background: '#0D0F1E', color: '#F4F4F6' }}>{m}</option>)}
                </select>
              </div>
              <div>
                <DLabel>Icon</DLabel>
                <select value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} style={ds}>
                  {ICONS.map(i => <option key={i} value={i} style={{ background: '#0D0F1E', color: '#F4F4F6' }}>{i}</option>)}
                </select>
              </div>
            </div>

            <div>
              <DLabel>Color</DLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{
                      height: '32px', width: '32px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      backgroundColor: c,
                      outline: form.color === c ? `3px solid ${c}` : 'none',
                      outlineOffset: '2px',
                      transform: form.color === c ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.15s',
                    }} />
                ))}
              </div>
            </div>
          </div>

          <div style={panelCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '12px', fontWeight: '700', color: '#F4F4F6', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>System Prompt</h2>
              <span style={{ fontSize: '12px', color: '#6B7080', fontFamily: 'monospace' }}>{form.system_prompt.length} chars</span>
            </div>
            <textarea
              value={form.system_prompt}
              onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
              rows={18}
              style={{ ...di, resize: 'none', lineHeight: '1.6', fontFamily: 'monospace', fontStyle: 'italic' }}
              placeholder="You are a specialist agent at Adexra…"
              onFocus={e => e.target.style.borderColor = 'rgba(51,98,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(244,244,246,0.12)'}
            />
          </div>
        </div>

        {/* Test chat panel */}
        <div style={{ ...panelCard, padding: 0, display: 'flex', flexDirection: 'column', height: '700px' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(244,244,246,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '12px', fontWeight: '700', color: '#F4F4F6', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px 0' }}>Test Chat</h2>
              <p style={{ fontSize: '12px', color: '#6B7080', margin: 0 }}>Uses the current system prompt (unsaved changes apply)</p>
            </div>
            <button onClick={() => setTestMessages([])}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7080', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#F4F4F6'}
              onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}>
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {testMessages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', textAlign: 'center' }}>
                <div style={{ height: '48px', width: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: form.color + '22' }}>
                  <Icon style={{ width: '24px', height: '24px', color: form.color }} />
                </div>
                <p style={{ fontSize: '14px', color: '#6B7080', margin: 0 }}>Send a message to test this agent's system prompt</p>
              </div>
            )}
            {testMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', borderRadius: '16px', padding: '12px 16px', fontSize: '14px', lineHeight: '1.6',
                  ...(msg.role === 'user'
                    ? { background: '#3362FF', color: '#F4F4F6', borderBottomRightRadius: '4px' }
                    : { background: 'rgba(244,244,246,0.06)', color: '#F4F4F6', borderBottomLeftRadius: '4px' }),
                }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', margin: 0 }}>{msg.content}</pre>
                </div>
              </div>
            ))}
            {testing && streamBuffer && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ maxWidth: '85%', background: 'rgba(244,244,246,0.06)', borderRadius: '16px', borderBottomLeftRadius: '4px', padding: '12px 16px', fontSize: '14px', lineHeight: '1.6', color: '#F4F4F6' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', margin: 0 }}>{streamBuffer}</pre>
                </div>
              </div>
            )}
            {testing && !streamBuffer && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'rgba(244,244,246,0.06)', borderRadius: '16px', borderBottomLeftRadius: '4px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[0,1,2].map(i => <div key={i} className="animate-bounce" style={{ height: '6px', width: '6px', background: '#6B7080', borderRadius: '99px', animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={sendTest} style={{ padding: '16px', borderTop: '1px solid rgba(244,244,246,0.07)', display: 'flex', gap: '12px' }}>
            <input
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              disabled={testing}
              placeholder="Test this agent…"
              style={{ ...di, flex: 1, opacity: testing ? 0.5 : 1 }}
              onFocus={e => e.target.style.borderColor = 'rgba(51,98,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(244,244,246,0.12)'}
            />
            <button type="submit" disabled={!testInput.trim() || testing}
              style={{ height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3362FF', color: '#F4F4F6', border: 'none', borderRadius: '12px', cursor: 'pointer', opacity: (!testInput.trim() || testing) ? 0.4 : 1, flexShrink: 0 }}>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
