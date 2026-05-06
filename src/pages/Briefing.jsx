import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { chatStream, chatCompletion, getEmbedding, cosineSimilarity } from '../lib/azure';
import {
  ArrowLeft, Send, Sparkles, Download, Plus, Trash2, ChevronDown, ChevronUp,
  Bot, Code, PenTool, TrendingUp, Layout, Cpu, Check, RefreshCcw, Play, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';

const ICON_MAP = { Brain: Cpu, Code, PenTool, TrendingUp, Layout, Bot };

// ── Utility: retrieve top-k RAG chunks by cosine similarity ──────────────────
function retrieveChunks(ragDocs, query, queryEmbedding, topK = 4) {
  const results = [];
  for (const doc of ragDocs) {
    if (!Array.isArray(doc.chunks)) continue;
    for (const chunk of doc.chunks) {
      if (!chunk.embedding) continue;
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      results.push({ text: chunk.text, score, docTitle: doc.title });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, topK);
}

// ── Extract structured JSON from briefing text ────────────────────────────────
async function extractBriefingJson(briefingText) {
  const { content } = await chatCompletion({
    model: 'gpt-4o',
    temperature: 0.3,
    max_tokens: 1500,
    messages: [{
      role: 'system',
      content: `You are a web agency strategist. Extract structured information from a client briefing.
Return ONLY valid JSON (no markdown, no explanation) with this schema:
{
  "business_name": string,
  "business_type": string,
  "location": string,
  "target_audience": string,
  "services_offered": string[],
  "main_goal": string,
  "tone": string,
  "competitors": string[],
  "integrations_needed": string[],
  "site_pages": [{ "name": string, "purpose": string, "suggested_sections": number }],
  "keywords_mentioned": string[],
  "budget_range": string,
  "deadline": string,
  "notes": string,
  "missing_info": string[]
}`
    }, {
      role: 'user', content: briefingText
    }]
  });
  try { return JSON.parse(content); } catch { return {}; }
}

// ── Run a single specialist agent ─────────────────────────────────────────────
async function runAgent({ agent, briefingText, extractedJson, memories, ragChunks, previousReports }) {
  const memoryBlock = memories.length
    ? `\n\n## Loaded Memory Buckets\n${memories.map(m => `### ${m.name} (${m.type})\n${m.content}`).join('\n\n')}`
    : '';
  const ragBlock = ragChunks.length
    ? `\n\n## Relevant Context (RAG)\n${ragChunks.map(c => `[${c.docTitle}]: ${c.text}`).join('\n\n')}`
    : '';
  const prevBlock = previousReports.length
    ? `\n\n## Other Agent Reports (for context)\n${previousReports.map(r => `### ${r.agentName}\n${r.content}`).join('\n\n')}`
    : '';

  const userContent = `# Client Briefing\n\n${briefingText}\n\n## Extracted Facts\n\`\`\`json\n${JSON.stringify(extractedJson, null, 2)}\n\`\`\`${memoryBlock}${ragBlock}${prevBlock}`;

  const { content, tokens } = await chatCompletion({
    model: agent.model,
    temperature: 0.6,
    max_tokens: 1800,
    messages: [
      { role: 'system', content: agent.system_prompt },
      { role: 'user', content: userContent },
    ]
  });
  return { content, tokens };
}

// ── Brain synthesizes all reports ─────────────────────────────────────────────
async function runBrain({ brainAgent, briefingText, extractedJson, agentReports, memories, onChunk }) {
  const memoryBlock = memories.length
    ? `\n\n## Loaded Memory\n${memories.map(m => `### ${m.name}\n${m.content}`).join('\n\n')}`
    : '';
  const reportsBlock = agentReports.map(r => `## ${r.agentName} Report\n\n${r.content}`).join('\n\n---\n\n');

  const userContent = `# Client Briefing\n\n${briefingText}\n\n## Extracted Client JSON\n\`\`\`json\n${JSON.stringify(extractedJson, null, 2)}\n\`\`\`${memoryBlock}\n\n---\n\n# Specialist Agent Reports\n\n${reportsBlock}`;

  return await chatStream({
    model: brainAgent.model,
    temperature: 0.5,
    max_tokens: 2500,
    messages: [
      { role: 'system', content: brainAgent.system_prompt },
      { role: 'user', content: userContent },
    ],
    onChunk,
  });
}

// ── Session selector ──────────────────────────────────────────────────────────
function SessionSelector({ sessions, activeId, onSelect, onCreate }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {sessions.map(s => (
        <button key={s.id} onClick={() => onSelect(s.id)}
          className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
            s.id === activeId ? 'bg-ink-primary text-white' : 'bg-white border border-border-light text-neutral-500 hover:bg-neutral-50')}>
          {s.title}
        </button>
      ))}
      <button onClick={onCreate} className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-neutral-300 text-neutral-400 rounded-xl text-xs font-medium hover:border-neutral-400 hover:text-neutral-600 transition-colors">
        <Plus className="h-3 w-3" /> New
      </button>
    </div>
  );
}

// ── Agent report card ─────────────────────────────────────────────────────────
function AgentReportCard({ agent, report, running }) {
  const [open, setOpen] = useState(true);
  const Icon = ICON_MAP[agent?.icon] || Bot;
  return (
    <div className="border border-border-light rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-neutral-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: (agent?.color || '#6366f1') + '22' }}>
            {running ? <div className="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: agent?.color || '#6366f1', borderTopColor: 'transparent' }} />
              : <Icon className="h-4 w-4" style={{ color: agent?.color || '#6366f1' }} />}
          </div>
          <div className="text-left">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{agent?.role}</div>
            <div className="text-sm font-medium text-ink-primary">{agent?.name}</div>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 bg-neutral-50 border-t border-border-light">
          <pre className="text-sm text-neutral-700 whitespace-pre-wrap font-sans leading-relaxed pt-4">
            {running ? <span className="text-neutral-400 italic animate-pulse">Agent thinking…</span> : report}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Briefing() {
  const { clientId } = useParams();
  const toast = useToast();
  const chatBottomRef = useRef(null);

  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [session, setSession] = useState(null);

  const [agents, setAgents] = useState([]);
  const [memories, setMemories] = useState([]);
  const [ragDocs, setRagDocs] = useState([]);

  // Session config
  const [selectedMemoryIds, setSelectedMemoryIds] = useState([]);
  const [selectedRagIds, setSelectedRagIds] = useState([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState([]);
  const [showConfig, setShowConfig] = useState(false);

  // Briefing & extraction
  const [briefingText, setBriefingText] = useState('');
  const [extractedJson, setExtractedJson] = useState({});
  const [extracting, setExtracting] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(true);

  // Agent run
  const [agentReports, setAgentReports] = useState({});
  const [runningAgentIds, setRunningAgentIds] = useState([]);
  const [brainOutput, setBrainOutput] = useState('');
  const [brainStreaming, setBrainStreaming] = useState(false);
  const [running, setRunning] = useState(false);

  // Chat
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const [chatStream_, setChatStream_] = useState('');

  useEffect(() => { loadAll() }, [clientId]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, chatStream_]);

  async function loadAll() {
    const [clientRes, sessionsRes, agentsRes, memRes, ragRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('brain_sessions').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('brain_agents').select('*').order('created_at'),
      supabase.from('brain_memory').select('*').order('name'),
      supabase.from('brain_rag').select('*').order('title'),
    ]);
    if (!clientRes.error) setClient(clientRes.data);
    const sessionList = sessionsRes.data || [];
    setSessions(sessionList);
    setAgents(agentsRes.data || []);
    setMemories(memRes.data || []);
    setRagDocs(ragRes.data || []);

    if (sessionList.length > 0) {
      await activateSession(sessionList[0], agentsRes.data || []);
    }
  }

  async function activateSession(s, agentList = agents) {
    setActiveSessionId(s.id);
    setSession(s);
    setBriefingText(s.briefing_text || '');
    setExtractedJson(s.extracted_json || {});
    setSelectedMemoryIds(s.memory_bucket_ids || []);
    setSelectedRagIds(s.rag_doc_ids || []);
    setAgentReports({});
    setBrainOutput('');

    // Default: select all non-brain agents
    const nonBrain = (agentList).filter(a => a.role !== 'Orchestrator').map(a => a.id);
    setSelectedAgentIds(nonBrain);

    // Load messages
    const { data: msgs } = await supabase.from('brain_messages').select('*').eq('session_id', s.id).order('created_at');
    setMessages(msgs || []);
  }

  async function createSession() {
    const { data, error } = await supabase.from('brain_sessions').insert({
      client_id: clientId,
      title: `Briefing ${sessions.length + 1}`,
      briefing_text: '',
      extracted_json: {},
      memory_bucket_ids: [],
      rag_doc_ids: [],
    }).select().single();
    if (error) { toast.error('Failed'); return; }
    setSessions(prev => [data, ...prev]);
    await activateSession(data);
    toast.success('New session created');
  }

  async function saveBriefing() {
    if (!activeSessionId) return;
    await supabase.from('brain_sessions').update({
      briefing_text: briefingText,
      memory_bucket_ids: selectedMemoryIds,
      rag_doc_ids: selectedRagIds,
      updated_at: new Date().toISOString(),
    }).eq('id', activeSessionId);
  }

  async function extract() {
    if (!briefingText.trim()) { toast.error('Paste a briefing first'); return; }
    setExtracting(true);
    try {
      const json = await extractBriefingJson(briefingText);
      setExtractedJson(json);
      await supabase.from('brain_sessions').update({ extracted_json: json, briefing_text: briefingText }).eq('id', activeSessionId);
      toast.success('Briefing extracted');
    } catch (err) {
      toast.error(err.message);
    }
    setExtracting(false);
  }

  async function runAllAgents() {
    if (!briefingText.trim()) { toast.error('Paste a briefing first'); return; }
    setRunning(true);
    setAgentReports({});
    setBrainOutput('');

    const activeAgents = agents.filter(a => selectedAgentIds.includes(a.id) && a.role !== 'Orchestrator');
    const brainAgent = agents.find(a => a.role === 'Orchestrator');
    const loadedMemories = memories.filter(m => selectedMemoryIds.includes(m.id));
    const loadedRagDocs = ragDocs.filter(d => selectedRagIds.includes(d.id));

    // Get query embedding for RAG retrieval
    let queryEmbedding = null;
    if (loadedRagDocs.some(d => Array.isArray(d.chunks) && d.chunks.length > 0)) {
      try { queryEmbedding = await getEmbedding(briefingText.slice(0, 500)); } catch {}
    }
    const ragChunks = queryEmbedding ? retrieveChunks(loadedRagDocs, briefingText, queryEmbedding) : [];

    // Run all specialist agents in parallel
    setRunningAgentIds(activeAgents.map(a => a.id));
    const reports = [];
    await Promise.all(activeAgents.map(async (agent) => {
      try {
        const { content, tokens } = await runAgent({
          agent, briefingText, extractedJson, memories: loadedMemories,
          ragChunks, previousReports: [],
        });
        setAgentReports(prev => ({ ...prev, [agent.id]: content }));
        reports.push({ agentName: agent.name, agentId: agent.id, content });
        // Save message
        if (activeSessionId) {
          await supabase.from('brain_messages').insert({
            session_id: activeSessionId,
            role: `agent_${agent.name.toLowerCase().replace(/\s+/g, '_')}`,
            agent_id: agent.id,
            content,
            model_used: agent.model,
            tokens_used: tokens,
          });
        }
      } catch (err) {
        setAgentReports(prev => ({ ...prev, [agent.id]: `Error: ${err.message}` }));
      }
      setRunningAgentIds(prev => prev.filter(id => id !== agent.id));
    }));

    // Run Brain to synthesize
    if (brainAgent && reports.length > 0) {
      setBrainStreaming(true);
      let brainFull = '';
      try {
        brainFull = await runBrain({
          brainAgent, briefingText, extractedJson, agentReports: reports,
          memories: loadedMemories,
          onChunk: (delta) => setBrainOutput(prev => prev + delta),
        });
        if (activeSessionId) {
          await supabase.from('brain_messages').insert({
            session_id: activeSessionId,
            role: 'agent_brain',
            agent_id: brainAgent.id,
            content: brainFull,
            model_used: brainAgent.model,
          });
        }
      } catch (err) {
        toast.error(`Brain error: ${err.message}`);
      }
      setBrainStreaming(false);
    }

    setRunning(false);
    toast.success('All agents complete');
  }

  async function sendChat(e) {
    e.preventDefault();
    if (!chatInput.trim() || chatting) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    const newUserMsg = { role: 'user', content: userMsg, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, newUserMsg]);
    setChatting(true);
    setChatStream_('');

    // Save user message
    if (activeSessionId) {
      await supabase.from('brain_messages').insert({ session_id: activeSessionId, role: 'user', content: userMsg });
    }

    // Build context: brain output or agent reports as system context
    const contextBlock = brainOutput
      ? `\n\n## Current Strategy Document\n${brainOutput}`
      : Object.keys(agentReports).length
        ? `\n\n## Agent Reports\n${Object.entries(agentReports).map(([id, r]) => {
            const a = agents.find(a => a.id === id);
            return `### ${a?.name || 'Agent'}\n${r}`;
          }).join('\n\n')}`
        : '';

    const loadedMemories = memories.filter(m => selectedMemoryIds.includes(m.id));
    const memBlock = loadedMemories.length
      ? `\n\n## Memory Context\n${loadedMemories.map(m => `### ${m.name}\n${m.content}`).join('\n\n')}`
      : '';

    const systemContent = `You are Brain, a senior web agency strategist at Adexra with deep expertise in web development, SEO, copywriting, UX, and digital marketing.

You are currently working on a client briefing. Answer questions with structured, actionable responses. When a question reveals new facts, note them clearly. Format key outputs as Markdown when appropriate.

## Client Briefing Context
${briefingText}

## Extracted Client Profile
\`\`\`json
${JSON.stringify(extractedJson, null, 2)}
\`\`\`${memBlock}${contextBlock}`;

    const history = messages.slice(-12).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

    let full = '';
    try {
      full = await chatStream({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemContent }, ...history, { role: 'user', content: userMsg }],
        temperature: 0.6,
        max_tokens: 1500,
        onChunk: (delta) => setChatStream_(prev => prev + delta),
      });
    } catch (err) {
      toast.error(err.message);
    }

    setChatStream_('');
    const assistantMsg = { role: 'assistant', content: full, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, assistantMsg]);
    setChatting(false);

    if (activeSessionId && full) {
      await supabase.from('brain_messages').insert({ session_id: activeSessionId, role: 'assistant', content: full, model_used: 'gpt-4o' });
    }
  }

  function exportMd() {
    const sections = [
      `# ${client?.name || 'Client'} — Strategy Briefing`,
      `\n## Client Profile\n\`\`\`json\n${JSON.stringify(extractedJson, null, 2)}\n\`\`\``,
      brainOutput ? `\n## Brain Strategy\n\n${brainOutput}` : '',
      ...Object.entries(agentReports).map(([id, r]) => {
        const a = agents.find(a => a.id === id);
        return `\n## ${a?.name || 'Agent'} Report\n\n${r}`;
      }),
    ].filter(Boolean).join('\n');
    const blob = new Blob([sections], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${(client?.name || 'client').replace(/\s+/g, '-')}-briefing.md`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const payload = { client: client?.name, profile: extractedJson, agentReports, brainSummary: brainOutput };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${(client?.name || 'client').replace(/\s+/g, '-')}-briefing.json`; a.click();
    URL.revokeObjectURL(url);
  }

  const brainAgent = agents.find(a => a.role === 'Orchestrator');
  const specialistAgents = agents.filter(a => a.role !== 'Orchestrator');
  const BrainIcon = ICON_MAP[brainAgent?.icon] || Cpu;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-3">
          <Link to={`/client/${clientId}`} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-ink-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> {client?.name || 'Client'}
          </Link>
          <h1 className="text-4xl font-serif text-ink-primary">Briefing Studio</h1>
          {client && <p className="text-sm text-neutral-500">{client.name}</p>}
        </div>
        <div className="flex items-center gap-2 pt-6">
          <button onClick={exportMd} className="flex items-center gap-2 px-4 py-2 border border-border-light text-neutral-600 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors">
            <Download className="h-3.5 w-3.5" /> .md
          </button>
          <button onClick={exportJson} className="flex items-center gap-2 px-4 py-2 border border-border-light text-neutral-600 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors">
            <Download className="h-3.5 w-3.5" /> .json
          </button>
        </div>
      </div>

      {/* Sessions */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sessions</div>
        <SessionSelector sessions={sessions} activeId={activeSessionId} onSelect={id => { const s = sessions.find(s => s.id === id); if (s) activateSession(s); }} onCreate={createSession} />
      </div>

      {activeSessionId && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left col: Briefing + config + agents */}
          <div className="xl:col-span-2 space-y-6">

            {/* Briefing input */}
            <div className="bg-white border border-border-light rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-primary uppercase tracking-[0.1em]">Client Briefing</h2>
                <button onClick={() => setShowConfig(o => !o)} className="text-xs text-neutral-400 hover:text-ink-primary transition-colors">
                  {showConfig ? 'Hide config' : 'Configure agents & memory'}
                </button>
              </div>
              <textarea
                value={briefingText}
                onChange={e => setBriefingText(e.target.value)}
                onBlur={saveBriefing}
                rows={8}
                className="w-full px-4 py-3 border border-border-light rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
                placeholder="Paste the full client briefing here — call notes, WhatsApp messages, emails, anything. The more context the better…"
              />
              <div className="flex items-center gap-3">
                <button onClick={extract} disabled={extracting || !briefingText.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 border border-border-light text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50">
                  <Sparkles className="h-4 w-4" />
                  {extracting ? 'Extracting…' : 'Extract Profile'}
                </button>
                <button onClick={runAllAgents} disabled={running || !briefingText.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-ink-primary text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50">
                  <Zap className="h-4 w-4" />
                  {running ? 'Running agents…' : 'Run All Agents'}
                </button>
              </div>
            </div>

            {/* Config panel */}
            {showConfig && (
              <div className="bg-white border border-border-light rounded-2xl p-6 space-y-6">
                <h2 className="text-sm font-bold text-ink-primary uppercase tracking-[0.1em]">Configuration</h2>

                <div className="space-y-3">
                  <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Active Agents</div>
                  <div className="flex flex-wrap gap-2">
                    {specialistAgents.map(a => {
                      const Icon = ICON_MAP[a.icon] || Bot;
                      const active = selectedAgentIds.includes(a.id);
                      return (
                        <button key={a.id} onClick={() => setSelectedAgentIds(prev => active ? prev.filter(id => id !== a.id) : [...prev, a.id])}
                          className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border',
                            active ? 'border-transparent text-white' : 'border-border-light text-neutral-500 bg-white hover:bg-neutral-50')}
                          style={active ? { backgroundColor: a.color } : {}}>
                          <Icon className="h-3.5 w-3.5" />
                          {a.name}
                          {active && <Check className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Memory Buckets</div>
                  <div className="flex flex-wrap gap-2">
                    {memories.map(m => {
                      const active = selectedMemoryIds.includes(m.id);
                      return (
                        <button key={m.id} onClick={() => setSelectedMemoryIds(prev => active ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                          className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border',
                            active ? 'bg-ink-primary text-white border-transparent' : 'border-border-light text-neutral-500 bg-white hover:bg-neutral-50')}>
                          {m.name} {active && '✓'}
                        </button>
                      );
                    })}
                    {memories.length === 0 && <span className="text-xs text-neutral-400">No memory buckets yet — create some in Memory.</span>}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">RAG Documents</div>
                  <div className="flex flex-wrap gap-2">
                    {ragDocs.filter(d => d.embedding_status === 'done').map(d => {
                      const active = selectedRagIds.includes(d.id);
                      return (
                        <button key={d.id} onClick={() => setSelectedRagIds(prev => active ? prev.filter(id => id !== d.id) : [...prev, d.id])}
                          className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border',
                            active ? 'bg-ink-primary text-white border-transparent' : 'border-border-light text-neutral-500 bg-white hover:bg-neutral-50')}>
                          {d.title} {active && '✓'}
                        </button>
                      );
                    })}
                    {ragDocs.filter(d => d.embedding_status === 'done').length === 0 && <span className="text-xs text-neutral-400">No embedded RAG docs yet.</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Agent reports */}
            {(Object.keys(agentReports).length > 0 || runningAgentIds.length > 0) && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-ink-primary uppercase tracking-[0.1em]">Agent Reports</h2>
                {specialistAgents.filter(a => selectedAgentIds.includes(a.id)).map(agent => (
                  (agentReports[agent.id] || runningAgentIds.includes(agent.id)) ? (
                    <AgentReportCard key={agent.id} agent={agent} report={agentReports[agent.id] || ''} running={runningAgentIds.includes(agent.id)} />
                  ) : null
                ))}
              </div>
            )}

            {/* Brain output */}
            {(brainOutput || brainStreaming) && (
              <div className="bg-white border-2 rounded-2xl overflow-hidden" style={{ borderColor: brainAgent?.color || '#8b5cf6' }}>
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border-light" style={{ backgroundColor: (brainAgent?.color || '#8b5cf6') + '11' }}>
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: (brainAgent?.color || '#8b5cf6') + '22' }}>
                    {brainStreaming
                      ? <div className="h-4 w-4 border-2 rounded-full animate-spin" style={{ borderColor: brainAgent?.color || '#8b5cf6', borderTopColor: 'transparent' }} />
                      : <BrainIcon className="h-4 w-4" style={{ color: brainAgent?.color || '#8b5cf6' }} />}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: brainAgent?.color || '#8b5cf6' }}>Brain — Orchestrator</div>
                    <div className="text-sm font-medium text-ink-primary">Unified Strategy</div>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <pre className="text-sm text-neutral-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {brainOutput || <span className="italic text-neutral-400 animate-pulse">Brain synthesizing…</span>}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Right col: JSON profile + chat */}
          <div className="space-y-6">
            {/* JSON profile */}
            <div className="bg-white border border-border-light rounded-2xl overflow-hidden">
              <button onClick={() => setJsonOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors">
                <div className="text-sm font-bold text-ink-primary uppercase tracking-[0.1em]">Client Profile</div>
                {jsonOpen ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
              </button>
              {jsonOpen && (
                <div className="border-t border-border-light">
                  {Object.keys(extractedJson).length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-neutral-400">
                      Paste a briefing and click Extract Profile
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {Object.entries(extractedJson).map(([key, val]) => (
                        <div key={key} className="border-b border-border-light last:border-0 px-5 py-3">
                          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</div>
                          <div className="text-sm text-ink-primary">
                            {Array.isArray(val)
                              ? val.length === 0 ? <span className="text-neutral-400 italic">—</span>
                              : typeof val[0] === 'object'
                                ? <pre className="text-xs text-neutral-600 whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>
                                : val.join(', ')
                              : typeof val === 'object' && val !== null
                                ? <pre className="text-xs text-neutral-600 whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>
                                : val || <span className="text-neutral-400 italic">—</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat */}
            <div className="bg-white border border-border-light rounded-2xl flex flex-col" style={{ height: '520px' }}>
              <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-ink-primary uppercase tracking-[0.1em]">Ask Brain</div>
                  <div className="text-xs text-neutral-400 mt-0.5">Ask anything about this client</div>
                </div>
                <button onClick={() => setMessages([])} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-ink-primary transition-colors">
                  <RefreshCcw className="h-3 w-3" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.filter(m => m.role === 'user' || m.role === 'assistant').length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                    <Cpu className="h-8 w-8 text-neutral-300" />
                    <p className="text-xs text-neutral-400 max-w-[200px]">Ask about pages, sections, CTAs, SEO — Brain knows this client.</p>
                  </div>
                )}
                {messages.filter(m => m.role === 'user' || m.role === 'assistant').map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user' ? 'bg-ink-primary text-white rounded-br-sm' : 'bg-neutral-100 text-ink-primary rounded-bl-sm')}>
                      <pre className="whitespace-pre-wrap font-sans text-xs">{msg.content}</pre>
                    </div>
                  </div>
                ))}
                {chatting && chatStream_ && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] bg-neutral-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                      <pre className="whitespace-pre-wrap font-sans text-xs text-ink-primary">{chatStream_}</pre>
                    </div>
                  </div>
                )}
                {chatting && !chatStream_ && (
                  <div className="flex justify-start">
                    <div className="bg-neutral-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                      <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={sendChat} className="p-3 border-t border-border-light flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={chatting}
                  placeholder="How many sections for the home page?"
                  className="flex-1 px-3 py-2 border border-border-light rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50" />
                <button type="submit" disabled={!chatInput.trim() || chatting}
                  className="h-9 w-9 flex items-center justify-center bg-ink-primary text-white rounded-xl disabled:opacity-40 hover:bg-neutral-800 transition-colors">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {!activeSessionId && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Sparkles className="h-10 w-10 text-neutral-300" />
          <p className="text-neutral-500 font-medium">No briefing sessions yet.</p>
          <button onClick={createSession} className="flex items-center gap-2 px-5 py-2.5 bg-ink-primary text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors">
            <Plus className="h-4 w-4" /> Start First Briefing
          </button>
        </div>
      )}
    </div>
  );
}
