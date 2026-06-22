import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { chatStream, chatCompletion, getEmbedding, cosineSimilarity } from '../lib/azure';
import {
  ArrowLeft, Send, Sparkles, Download, Plus, ChevronDown, ChevronUp,
  Bot, Code, PenTool, TrendingUp, Layout, Cpu, Check, RefreshCcw, Zap,
  AlertCircle, CheckCircle2, Clock, XCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';

const ICON_MAP = { Brain: Cpu, Code, PenTool, TrendingUp, Layout, Bot };

// ── Agent status types ────────────────────────────────────────────────────────
// idle | running | done | error
const STATUS_ICON = {
  idle:    <Clock className="h-3.5 w-3.5 text-neutral-300" />,
  running: null, // spinner rendered inline
  done:    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  error:   <XCircle className="h-3.5 w-3.5 text-red-400" />,
};

// ── RAG retrieval ─────────────────────────────────────────────────────────────
function retrieveChunks(ragDocs, queryEmbedding, topK = 4) {
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

// ── Extract structured JSON ───────────────────────────────────────────────────
async function extractBriefingJson(briefingText) {
  const { content } = await chatCompletion({
    model: 'gpt-4o',
    temperature: 0.3,
    max_tokens: 1800,
    messages: [
      {
        role: 'system',
        content: `You are a web agency strategist. Extract structured information from a client briefing.
Return ONLY valid JSON — no markdown fences, no explanation, no trailing text.
Schema:
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
}`,
      },
      { role: 'user', content: briefingText },
    ],
  });
  // Strip any accidental markdown fences before parsing
  const cleaned = content.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Extraction returned invalid JSON. Model output was:\n\n${content.slice(0, 300)}`);
  }
  return parsed;
}

// ── Run one specialist agent ──────────────────────────────────────────────────
async function runAgent({ agent, briefingText, extractedJson, memories, ragChunks }) {
  const memoryBlock = memories.length
    ? `\n\n## Loaded Memory\n${memories.map(m => `### ${m.name} (${m.type})\n${m.content}`).join('\n\n')}`
    : '';
  const ragBlock = ragChunks.length
    ? `\n\n## Relevant RAG Context\n${ragChunks.map(c => `[${c.docTitle}]\n${c.text}`).join('\n\n')}`
    : '';

  const userContent =
    `# Client Briefing\n\n${briefingText}\n\n` +
    `## Extracted Profile (JSON)\n\`\`\`json\n${JSON.stringify(extractedJson, null, 2)}\n\`\`\`` +
    memoryBlock + ragBlock;

  const { content, tokens } = await chatCompletion({
    model: agent.model,
    temperature: 0.6,
    max_tokens: 2000,
    messages: [
      { role: 'system', content: agent.system_prompt },
      { role: 'user', content: userContent },
    ],
  });
  return { content, tokens };
}

// ── Brain synthesizes all reports (streamed) ──────────────────────────────────
async function runBrainStream({ brainAgent, briefingText, extractedJson, reports, memories, onChunk }) {
  const memoryBlock = memories.length
    ? `\n\n## Loaded Memory\n${memories.map(m => `### ${m.name}\n${m.content}`).join('\n\n')}`
    : '';
  const reportsBlock = reports
    .map(r => `## ${r.agentName} Report\n\n${r.content}`)
    .join('\n\n---\n\n');

  const userContent =
    `# Client Briefing\n\n${briefingText}\n\n` +
    `## Extracted Client Profile\n\`\`\`json\n${JSON.stringify(extractedJson, null, 2)}\n\`\`\`` +
    memoryBlock +
    `\n\n---\n\n# Specialist Agent Reports\n\n${reportsBlock}`;

  return await chatStream({
    model: brainAgent.model,
    temperature: 0.5,
    max_tokens: 3000,
    messages: [
      { role: 'system', content: brainAgent.system_prompt },
      { role: 'user', content: userContent },
    ],
    onChunk,
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────
function AgentStatusRow({ agent, status, errorMsg }) {
  const Icon = ICON_MAP[agent?.icon] || Bot;
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
      status === 'running' ? 'border-blue-200 bg-blue-50' :
      status === 'done'    ? 'border-green-200 bg-green-50' :
      status === 'error'   ? 'border-red-200 bg-red-50' :
      'border-border-light bg-white'
    )}>
      <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: (agent?.color || '#6366f1') + '22' }}>
        {status === 'running'
          ? <div className="h-3.5 w-3.5 border-2 rounded-full animate-spin"
              style={{ borderColor: agent?.color || '#6366f1', borderTopColor: 'transparent' }} />
          : <Icon className="h-3.5 w-3.5" style={{ color: agent?.color || '#6366f1' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-ink-primary">{agent?.name}</div>
        {status === 'error' && errorMsg && (
          <div className="text-[10px] text-red-500 truncate mt-0.5">{errorMsg}</div>
        )}
      </div>
      <div className="shrink-0">
        {status === 'running' ? null : STATUS_ICON[status]}
      </div>
    </div>
  );
}

function AgentReportCard({ agent, report, status, errorMsg }) {
  const [open, setOpen] = useState(true);
  const Icon = ICON_MAP[agent?.icon] || Bot;
  const isError = status === 'error';

  return (
    <div className={cn('border rounded-2xl overflow-hidden', isError ? 'border-red-200' : 'border-border-light')}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-neutral-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: (agent?.color || '#6366f1') + '22' }}>
            {status === 'running'
              ? <div className="h-4 w-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: agent?.color || '#6366f1', borderTopColor: 'transparent' }} />
              : <Icon className="h-4 w-4" style={{ color: agent?.color || '#6366f1' }} />}
          </div>
          <div className="text-left">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{agent?.role}</div>
            <div className="text-sm font-medium text-ink-primary flex items-center gap-2">
              {agent?.name}
              {isError && <span className="text-[10px] text-red-500 font-normal">— failed</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {STATUS_ICON[status]}
          {open ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
        </div>
      </button>
      {open && (
        <div className={cn('px-5 pb-5 border-t border-border-light', isError ? 'bg-red-50' : 'bg-neutral-50')}>
          {status === 'running' ? (
            <div className="pt-4 flex items-center gap-2 text-sm text-neutral-400 italic">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="h-1.5 w-1.5 bg-neutral-300 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              Thinking…
            </div>
          ) : isError ? (
            <div className="pt-4">
              <div className="flex items-start gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <pre className="whitespace-pre-wrap font-sans">{errorMsg || report}</pre>
              </div>
            </div>
          ) : (
            <pre className="text-sm text-neutral-700 whitespace-pre-wrap font-sans leading-relaxed pt-4">{report}</pre>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Briefing() {
  const { clientId } = useParams();
  const toast = useToast();
  const chatBottomRef = useRef(null);

  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const [agents, setAgents] = useState([]);
  const [memories, setMemories] = useState([]);
  const [ragDocs, setRagDocs] = useState([]);

  // Per-session config
  const [selectedMemoryIds, setSelectedMemoryIds] = useState([]);
  const [selectedRagIds, setSelectedRagIds] = useState([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState([]);
  const [showConfig, setShowConfig] = useState(false);

  // Briefing state
  const [briefingText, setBriefingText] = useState('');
  const [extractedJson, setExtractedJson] = useState({});
  const [extracting, setExtracting] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(true);

  // Agent run state — keyed by agent.id
  // { [agentId]: { status: 'idle'|'running'|'done'|'error', report: string, error: string } }
  const [agentState, setAgentState] = useState({});
  const [brainOutput, setBrainOutput] = useState('');
  const [brainStatus, setBrainStatus] = useState('idle'); // idle | running | done | error
  const [brainError, setBrainError] = useState('');
  const [running, setRunning] = useState(false);

  // Chat
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Use a ref to always read fresh extractedJson inside async callbacks
  const extractedJsonRef = useRef({});
  useEffect(() => { extractedJsonRef.current = extractedJson; }, [extractedJson]);

  useEffect(() => { loadAll(); }, [clientId]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingContent]);

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
    const agentList = agentsRes.data || [];
    setAgents(agentList);
    setMemories(memRes.data || []);
    setRagDocs(ragRes.data || []);
    if (sessionList.length > 0) activateSession(sessionList[0], agentList);
  }

  function activateSession(s, agentList = agents) {
    setActiveSessionId(s.id);
    setBriefingText(s.briefing_text || '');
    const json = s.extracted_json || {};
    setExtractedJson(json);
    extractedJsonRef.current = json;
    setSelectedMemoryIds(s.memory_bucket_ids || []);
    setSelectedRagIds(s.rag_doc_ids || []);
    setAgentState({});
    setBrainOutput('');
    setBrainStatus('idle');
    setBrainError('');
    // Default: select all non-orchestrator agents
    const nonBrain = agentList.filter(a => a.role !== 'Orchestrator').map(a => a.id);
    setSelectedAgentIds(nonBrain);
    // Load chat history
    supabase.from('brain_messages').select('*').eq('session_id', s.id).order('created_at')
      .then(({ data }) => setMessages(data || []));
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
    if (error) { toast.error('Failed to create session'); return; }
    setSessions(prev => [data, ...prev]);
    activateSession(data);
    toast.success('New session created');
  }

  async function saveBriefingToDb(text = briefingText) {
    if (!activeSessionId) return;
    await supabase.from('brain_sessions').update({
      briefing_text: text,
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
      extractedJsonRef.current = json;
      await supabase.from('brain_sessions').update({
        extracted_json: json,
        briefing_text: briefingText,
        updated_at: new Date().toISOString(),
      }).eq('id', activeSessionId);
      toast.success('Profile extracted');
    } catch (err) {
      toast.error(err.message);
    }
    setExtracting(false);
  }

  async function runAllAgents() {
    if (!briefingText.trim()) { toast.error('Paste a briefing first'); return; }
    setRunning(true);
    setBrainOutput('');
    setBrainStatus('idle');
    setBrainError('');

    const activeAgents = agents.filter(a => selectedAgentIds.includes(a.id) && a.role !== 'Orchestrator');
    const brainAgent = agents.find(a => a.role === 'Orchestrator');
    const loadedMemories = memories.filter(m => selectedMemoryIds.includes(m.id));
    const loadedRagDocs = ragDocs.filter(d => selectedRagIds.includes(d.id));

    if (activeAgents.length === 0) {
      toast.error('No specialist agents selected');
      setRunning(false);
      return;
    }

    // Read JSON from ref — guaranteed fresh even if extract() was called moments ago
    const currentJson = extractedJsonRef.current;

    // RAG embedding for retrieval
    let ragChunks = [];
    if (loadedRagDocs.some(d => Array.isArray(d.chunks) && d.chunks.length > 0)) {
      try {
        const queryEmbedding = await getEmbedding(briefingText.slice(0, 600));
        ragChunks = retrieveChunks(loadedRagDocs, queryEmbedding);
      } catch (e) {
        toast.error(`RAG embedding failed (continuing without RAG): ${e.message}`);
      }
    }

    // Mark all selected agents as running
    const initialState = {};
    for (const a of activeAgents) initialState[a.id] = { status: 'running', report: '', error: '' };
    setAgentState(initialState);

    // Run all specialist agents in parallel, collecting results
    const reports = [];
    await Promise.all(
      activeAgents.map(async (agent) => {
        try {
          const { content, tokens } = await runAgent({
            agent,
            briefingText,
            extractedJson: currentJson,
            memories: loadedMemories,
            ragChunks,
          });
          // Mark done
          setAgentState(prev => ({ ...prev, [agent.id]: { status: 'done', report: content, error: '' } }));
          reports.push({ agentName: agent.name, agentId: agent.id, content });
          // Persist to Supabase
          supabase.from('brain_messages').insert({
            session_id: activeSessionId,
            role: `agent_${agent.name.toLowerCase().replace(/\s+/g, '_')}`,
            agent_id: agent.id,
            content,
            model_used: agent.model,
            tokens_used: tokens,
          }).then(({ error }) => {
            if (error) console.error('Failed to save agent message:', error);
          });
        } catch (err) {
          const errorMsg = err.message || String(err);
          setAgentState(prev => ({ ...prev, [agent.id]: { status: 'error', report: '', error: errorMsg } }));
          // Still add a placeholder so Brain knows this agent failed
          reports.push({ agentName: agent.name, agentId: agent.id, content: `[AGENT FAILED: ${errorMsg}]` });
          // Log to console so nothing dies silently
          console.error(`Agent "${agent.name}" failed:`, err);
        }
      })
    );

    // Only run Brain if at least one agent succeeded
    const successfulReports = reports.filter(r => !r.content.startsWith('[AGENT FAILED'));
    if (!brainAgent) {
      toast.error('No Brain (Orchestrator) agent found — add one in /agents');
      setRunning(false);
      return;
    }
    if (successfulReports.length === 0) {
      toast.error('All agents failed — Brain has nothing to synthesize');
      setRunning(false);
      return;
    }

    setBrainStatus('running');
    try {
      const brainFull = await runBrainStream({
        brainAgent,
        briefingText,
        extractedJson: currentJson,
        reports, // pass ALL reports including failures so Brain can note gaps
        memories: loadedMemories,
        onChunk: (delta) => setBrainOutput(prev => prev + delta),
      });
      setBrainStatus('done');
      // Persist Brain output
      supabase.from('brain_messages').insert({
        session_id: activeSessionId,
        role: 'agent_brain',
        agent_id: brainAgent.id,
        content: brainFull,
        model_used: brainAgent.model,
      }).then(({ error }) => {
        if (error) console.error('Failed to save Brain message:', error);
      });
    } catch (err) {
      const errorMsg = err.message || String(err);
      setBrainStatus('error');
      setBrainError(errorMsg);
      console.error('Brain failed:', err);
      toast.error(`Brain failed: ${errorMsg}`);
    }

    setRunning(false);
    const failCount = reports.filter(r => r.content.startsWith('[AGENT FAILED')).length;
    if (failCount > 0) {
      toast.error(`${failCount} agent(s) failed — see reports for details`);
    } else {
      toast.success('All agents complete');
    }
  }

  async function sendChat(e) {
    e.preventDefault();
    if (!chatInput.trim() || chatting) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, created_at: new Date().toISOString() }]);
    setChatting(true);
    setStreamingContent('');

    supabase.from('brain_messages').insert({ session_id: activeSessionId, role: 'user', content: userMsg });

    // Build context block from whatever is available
    const successReports = Object.entries(agentState)
      .filter(([, s]) => s.status === 'done')
      .map(([id, s]) => {
        const a = agents.find(a => a.id === id);
        return `### ${a?.name || 'Agent'}\n${s.report}`;
      });

    const contextBlock =
      brainOutput ? `\n\n## Strategy Document (Brain)\n${brainOutput}` :
      successReports.length ? `\n\n## Agent Reports\n${successReports.join('\n\n')}` : '';

    const loadedMemories = memories.filter(m => selectedMemoryIds.includes(m.id));
    const memBlock = loadedMemories.length
      ? `\n\n## Memory Context\n${loadedMemories.map(m => `### ${m.name}\n${m.content}`).join('\n\n')}`
      : '';

    const systemContent =
      `You are Brain — senior web agency strategist at Adexra. Expert in web development, SEO, copywriting, UX, and digital marketing.\n\n` +
      `You are actively working on a client brief. Give structured, specific, actionable answers. ` +
      `Format responses as Markdown when it helps clarity.\n\n` +
      `## Client Briefing\n${briefingText}\n\n` +
      `## Extracted Profile\n\`\`\`json\n${JSON.stringify(extractedJsonRef.current, null, 2)}\n\`\`\`` +
      memBlock + contextBlock;

    // Use last 12 chat messages as history, mapping agent roles → assistant
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

    let full = '';
    try {
      full = await chatStream({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemContent }, ...history, { role: 'user', content: userMsg }],
        temperature: 0.6,
        max_tokens: 1500,
        onChunk: (delta) => setStreamingContent(prev => prev + delta),
      });
    } catch (err) {
      const errorMsg = err.message || String(err);
      console.error('Chat error:', err);
      toast.error(errorMsg);
      full = `[Error: ${errorMsg}]`;
    }

    setStreamingContent('');
    setMessages(prev => [...prev, { role: 'assistant', content: full, created_at: new Date().toISOString() }]);
    setChatting(false);

    if (full && !full.startsWith('[Error:')) {
      supabase.from('brain_messages').insert({
        session_id: activeSessionId,
        role: 'assistant',
        content: full,
        model_used: 'gpt-4o',
      });
    }
  }

  function exportMd() {
    const doneReports = Object.entries(agentState)
      .filter(([, s]) => s.status === 'done')
      .map(([id, s]) => {
        const a = agents.find(a => a.id === id);
        return `## ${a?.name || 'Agent'} Report\n\n${s.report}`;
      });

    const sections = [
      `# ${client?.name || 'Client'} — Strategy Briefing`,
      `\n## Client Profile\n\`\`\`json\n${JSON.stringify(extractedJson, null, 2)}\n\`\`\``,
      brainOutput ? `\n## Brain — Unified Strategy\n\n${brainOutput}` : '',
      doneReports.length ? `\n${doneReports.join('\n\n')}` : '',
    ].filter(Boolean).join('\n');

    const blob = new Blob([sections], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(client?.name || 'client').replace(/\s+/g, '-').toLowerCase()}-briefing.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const agentReports = {};
    for (const [id, s] of Object.entries(agentState)) {
      const a = agents.find(a => a.id === id);
      agentReports[a?.name || id] = { status: s.status, report: s.report, error: s.error };
    }
    const payload = {
      client: client?.name,
      session_id: activeSessionId,
      extracted_profile: extractedJson,
      agent_reports: agentReports,
      brain_strategy: brainOutput,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(client?.name || 'client').replace(/\s+/g, '-').toLowerCase()}-briefing.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Derived
  const brainAgent = agents.find(a => a.role === 'Orchestrator');
  const specialistAgents = agents.filter(a => a.role !== 'Orchestrator');
  const BrainIcon = ICON_MAP[brainAgent?.icon] || Cpu;
  const selectedSpecialists = specialistAgents.filter(a => selectedAgentIds.includes(a.id));
  const anyAgentRunning = Object.values(agentState).some(s => s.status === 'running');
  const chatMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">

      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-3">
          <Link to={`/client/${clientId}`}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-ink-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> {client?.name || 'Client'}
          </Link>
          <h1 className="text-4xl font-serif text-ink-primary">Briefing Studio</h1>
          {client && <p className="text-sm text-neutral-500">{client.name}</p>}
        </div>
        <div className="flex items-center gap-2 pt-6">
          <button onClick={exportMd}
            className="flex items-center gap-2 px-4 py-2 border border-border-light text-neutral-600 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors">
            <Download className="h-3.5 w-3.5" /> .md
          </button>
          <button onClick={exportJson}
            className="flex items-center gap-2 px-4 py-2 border border-border-light text-neutral-600 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors">
            <Download className="h-3.5 w-3.5" /> .json
          </button>
        </div>
      </div>

      {/* Session tabs */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sessions</div>
        <div className="flex items-center gap-2 flex-wrap">
          {sessions.map(s => (
            <button key={s.id} onClick={() => activateSession(s)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
                s.id === activeSessionId
                  ? 'bg-ink-primary text-white'
                  : 'bg-white border border-border-light text-neutral-500 hover:bg-neutral-50')}>
              {s.title}
            </button>
          ))}
          <button onClick={createSession}
            className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-neutral-300 text-neutral-400 rounded-xl text-xs font-medium hover:border-neutral-400 hover:text-neutral-600 transition-colors">
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
      </div>

      {activeSessionId && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* ── LEFT: Briefing + config + run panel + reports ── */}
          <div className="xl:col-span-2 space-y-6">

            {/* Briefing input */}
            <div className="bg-white border border-border-light rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-primary uppercase tracking-[0.1em]">Client Briefing</h2>
                <button onClick={() => setShowConfig(o => !o)}
                  className="text-xs text-neutral-400 hover:text-ink-primary transition-colors">
                  {showConfig ? 'Hide config' : 'Configure agents & memory'}
                </button>
              </div>
              <textarea
                value={briefingText}
                onChange={e => setBriefingText(e.target.value)}
                onBlur={() => saveBriefingToDb()}
                rows={8}
                className="w-full px-4 py-3 border border-border-light rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
                placeholder="Paste the full client briefing — call notes, WhatsApp messages, emails. The more context the better…"
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
                  {running ? 'Running…' : 'Run All Agents'}
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
                        <button key={a.id}
                          onClick={() => setSelectedAgentIds(prev => active ? prev.filter(id => id !== a.id) : [...prev, a.id])}
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
                    {memories.length === 0
                      ? <span className="text-xs text-neutral-400">No memory buckets — create some in /memory.</span>
                      : memories.map(m => {
                          const active = selectedMemoryIds.includes(m.id);
                          return (
                            <button key={m.id}
                              onClick={() => setSelectedMemoryIds(prev => active ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                              className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border',
                                active ? 'bg-ink-primary text-white border-transparent' : 'border-border-light text-neutral-500 bg-white hover:bg-neutral-50')}>
                              {m.name}{active ? ' ✓' : ''}
                            </button>
                          );
                        })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">RAG Documents</div>
                  <div className="flex flex-wrap gap-2">
                    {ragDocs.filter(d => d.embedding_status === 'done').length === 0
                      ? <span className="text-xs text-neutral-400">No embedded RAG docs — add and embed some in /rag.</span>
                      : ragDocs.filter(d => d.embedding_status === 'done').map(d => {
                          const active = selectedRagIds.includes(d.id);
                          return (
                            <button key={d.id}
                              onClick={() => setSelectedRagIds(prev => active ? prev.filter(id => id !== d.id) : [...prev, d.id])}
                              className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border',
                                active ? 'bg-ink-primary text-white border-transparent' : 'border-border-light text-neutral-500 bg-white hover:bg-neutral-50')}>
                              {d.title}{active ? ' ✓' : ''}
                            </button>
                          );
                        })}
                  </div>
                </div>
              </div>
            )}

            {/* Live status panel — shown as soon as Run is clicked */}
            {Object.keys(agentState).length > 0 && (
              <div className="bg-white border border-border-light rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-ink-primary uppercase tracking-[0.1em]">Agent Status</h2>
                  <div className="flex items-center gap-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> {Object.values(agentState).filter(s => s.status === 'done').length} done</span>
                    <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-400" /> {Object.values(agentState).filter(s => s.status === 'error').length} failed</span>
                    {anyAgentRunning && <span className="flex items-center gap-1 text-blue-500"><Clock className="h-3 w-3" /> running…</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedSpecialists.map(a => (
                    <AgentStatusRow
                      key={a.id}
                      agent={a}
                      status={agentState[a.id]?.status || 'idle'}
                      errorMsg={agentState[a.id]?.error}
                    />
                  ))}
                </div>
                {/* Brain row */}
                <div className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border',
                  brainStatus === 'running' ? 'border-purple-200 bg-purple-50' :
                  brainStatus === 'done'    ? 'border-green-200 bg-green-50' :
                  brainStatus === 'error'   ? 'border-red-200 bg-red-50' :
                  'border-border-light bg-neutral-50'
                )}>
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: (brainAgent?.color || '#8b5cf6') + '22' }}>
                    {brainStatus === 'running'
                      ? <div className="h-3.5 w-3.5 border-2 rounded-full animate-spin"
                          style={{ borderColor: brainAgent?.color || '#8b5cf6', borderTopColor: 'transparent' }} />
                      : <BrainIcon className="h-3.5 w-3.5" style={{ color: brainAgent?.color || '#8b5cf6' }} />}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-ink-primary">
                      Brain {brainStatus === 'running' ? '— synthesizing…' : brainStatus === 'done' ? '— complete' : brainStatus === 'error' ? '— failed' : '— waiting for agents'}
                    </div>
                    {brainStatus === 'error' && <div className="text-[10px] text-red-500 mt-0.5">{brainError}</div>}
                  </div>
                  {STATUS_ICON[brainStatus]}
                </div>
              </div>
            )}

            {/* Expanded agent reports */}
            {Object.keys(agentState).length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-ink-primary uppercase tracking-[0.1em]">Agent Reports</h2>
                {selectedSpecialists.map(agent => {
                  const s = agentState[agent.id];
                  if (!s) return null;
                  return (
                    <AgentReportCard
                      key={agent.id}
                      agent={agent}
                      report={s.report}
                      status={s.status}
                      errorMsg={s.error}
                    />
                  );
                })}
              </div>
            )}

            {/* Brain output */}
            {(brainOutput || brainStatus === 'running') && (
              <div className="rounded-2xl overflow-hidden border-2"
                style={{ borderColor: brainAgent?.color || '#8b5cf6' }}>
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border-light"
                  style={{ backgroundColor: (brainAgent?.color || '#8b5cf6') + '11' }}>
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: (brainAgent?.color || '#8b5cf6') + '22' }}>
                    {brainStatus === 'running'
                      ? <div className="h-4 w-4 border-2 rounded-full animate-spin"
                          style={{ borderColor: brainAgent?.color || '#8b5cf6', borderTopColor: 'transparent' }} />
                      : <BrainIcon className="h-4 w-4" style={{ color: brainAgent?.color || '#8b5cf6' }} />}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: brainAgent?.color || '#8b5cf6' }}>Brain — Orchestrator</div>
                    <div className="text-sm font-medium text-ink-primary">
                      {brainStatus === 'running' ? 'Synthesizing…' : 'Unified Strategy'}
                    </div>
                  </div>
                </div>
                <div className="px-6 py-5 bg-white">
                  <pre className="text-sm text-neutral-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {brainOutput || <span className="italic text-neutral-400 animate-pulse">Brain is thinking…</span>}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Client profile JSON + chat ── */}
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
                      Paste a briefing and click <strong>Extract Profile</strong>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto divide-y divide-border-light">
                      {Object.entries(extractedJson).map(([key, val]) => (
                        <div key={key} className="px-5 py-3">
                          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-ink-primary">
                            {Array.isArray(val)
                              ? val.length === 0
                                ? <span className="text-neutral-400 italic">—</span>
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
            <div className="bg-white border border-border-light rounded-2xl flex flex-col" style={{ height: '560px' }}>
              <div className="px-5 py-4 border-b border-border-light flex items-center justify-between shrink-0">
                <div>
                  <div className="text-sm font-bold text-ink-primary uppercase tracking-[0.1em]">Ask Brain</div>
                  <div className="text-xs text-neutral-400 mt-0.5">Uses all context above</div>
                </div>
                <button onClick={() => setMessages([])}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-ink-primary transition-colors"
                  title="Clear chat history">
                  <RefreshCcw className="h-3 w-3" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                    <Cpu className="h-8 w-8 text-neutral-300" />
                    <p className="text-xs text-neutral-400 max-w-[200px]">
                      Ask about pages, sections, CTAs, SEO, copy — Brain knows this client.
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-ink-primary text-white rounded-br-sm'
                        : 'bg-neutral-100 text-ink-primary rounded-bl-sm'
                    )}>
                      <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                    </div>
                  </div>
                ))}
                {chatting && streamingContent && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] bg-neutral-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                      <pre className="whitespace-pre-wrap font-sans text-xs text-ink-primary">{streamingContent}</pre>
                    </div>
                  </div>
                )}
                {chatting && !streamingContent && (
                  <div className="flex justify-start">
                    <div className="bg-neutral-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <div key={i} className="h-1.5 w-1.5 bg-neutral-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={sendChat} className="p-3 border-t border-border-light flex gap-2 shrink-0">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  disabled={chatting}
                  placeholder="How many sections for the home page?"
                  className="flex-1 px-3 py-2 border border-border-light rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50"
                />
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
          <button onClick={createSession}
            className="flex items-center gap-2 px-5 py-2.5 bg-ink-primary text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors">
            <Plus className="h-4 w-4" /> Start First Briefing
          </button>
        </div>
      )}
    </div>
  );
}
