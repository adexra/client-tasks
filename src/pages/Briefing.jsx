import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { chatStream, chatCompletion, getEmbedding, cosineSimilarity } from '../lib/azure';
import {
  ArrowLeft, Send, Sparkles, Download, Plus, ChevronDown, ChevronUp,
  Bot, Code, PenTool, TrendingUp, Layout, Cpu, Check, RefreshCcw, Zap,
  AlertCircle, CheckCircle2, Clock, XCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const ICON_MAP = { Brain: Cpu, Code, PenTool, TrendingUp, Layout, Bot };

const STATUS_ICON = {
  idle:    <Clock style={{ width: '14px', height: '14px', color: '#6B7080' }} />,
  running: null,
  done:    <CheckCircle2 style={{ width: '14px', height: '14px', color: '#22C55E' }} />,
  error:   <XCircle style={{ width: '14px', height: '14px', color: '#FF3B5C' }} />,
};

const panelCard = {
  background: '#0D0F1E',
  border: '1px solid rgba(244,244,246,0.08)',
  borderRadius: '16px',
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
  resize: 'none',
  lineHeight: '1.6',
};

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
  const cleaned = content.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Extraction returned invalid JSON. Model output was:\n\n${content.slice(0, 300)}`);
  }
  return parsed;
}

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

async function runBrainStream({ brainAgent, briefingText, extractedJson, reports, memories, onChunk }) {
  const memoryBlock = memories.length
    ? `\n\n## Loaded Memory\n${memories.map(m => `### ${m.name}\n${m.content}`).join('\n\n')}`
    : '';
  const reportsBlock = reports.map(r => `## ${r.agentName} Report\n\n${r.content}`).join('\n\n---\n\n');
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

function AgentStatusRow({ agent, status, errorMsg }) {
  const Icon = ICON_MAP[agent?.icon] || Bot;
  const statusColors = {
    running: { bg: 'rgba(51,98,255,0.08)', border: 'rgba(51,98,255,0.3)' },
    done:    { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.3)' },
    error:   { bg: 'rgba(255,59,92,0.08)', border: 'rgba(255,59,92,0.3)' },
    idle:    { bg: 'rgba(244,244,246,0.03)', border: 'rgba(244,244,246,0.08)' },
  };
  const sc = statusColors[status] || statusColors.idle;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${sc.border}`, background: sc.bg }}>
      <div style={{ height: '28px', width: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: (agent?.color || '#6366f1') + '22' }}>
        {status === 'running'
          ? <div className="animate-spin" style={{ height: '14px', width: '14px', border: `2px solid ${agent?.color || '#6366f1'}`, borderTopColor: 'transparent', borderRadius: '99px' }} />
          : <Icon style={{ width: '14px', height: '14px', color: agent?.color || '#6366f1' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: '500', color: '#F4F4F6' }}>{agent?.name}</div>
        {status === 'error' && errorMsg && (
          <div style={{ fontSize: '10px', color: '#FF3B5C', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{errorMsg}</div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        {status !== 'running' && STATUS_ICON[status]}
      </div>
    </div>
  );
}

function AgentReportCard({ agent, report, status, errorMsg }) {
  const [open, setOpen] = useState(true);
  const Icon = ICON_MAP[agent?.icon] || Bot;
  const isError = status === 'error';
  return (
    <div style={{ border: `1px solid ${isError ? 'rgba(255,59,92,0.3)' : 'rgba(244,244,246,0.08)'}`, borderRadius: '16px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#0D0F1E', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,244,246,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = '#0D0F1E'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ height: '32px', width: '32px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: (agent?.color || '#6366f1') + '22' }}>
            {status === 'running'
              ? <div className="animate-spin" style={{ height: '16px', width: '16px', border: `2px solid ${agent?.color || '#6366f1'}`, borderTopColor: 'transparent', borderRadius: '99px' }} />
              : <Icon style={{ width: '16px', height: '16px', color: agent?.color || '#6366f1' }} />}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#6B7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{agent?.role}</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#F4F4F6', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {agent?.name}
              {isError && <span style={{ fontSize: '10px', color: '#FF3B5C', fontWeight: '400' }}>— failed</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {STATUS_ICON[status]}
          {open ? <ChevronUp style={{ width: '16px', height: '16px', color: '#6B7080' }} /> : <ChevronDown style={{ width: '16px', height: '16px', color: '#6B7080' }} />}
        </div>
      </button>
      {open && (
        <div style={{ padding: '20px', borderTop: '1px solid rgba(244,244,246,0.07)', background: isError ? 'rgba(255,59,92,0.05)' : 'rgba(244,244,246,0.02)' }}>
          {status === 'running' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6B7080', fontStyle: 'italic' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0,1,2].map(i => <div key={i} className="animate-bounce" style={{ height: '6px', width: '6px', background: '#6B7080', borderRadius: '99px', animationDelay: `${i * 0.15}s` }} />)}
              </div>
              Thinking…
            </div>
          ) : isError ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#FF3B5C' }}>
              <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} />
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', margin: 0 }}>{errorMsg || report}</pre>
            </div>
          ) : (
            <pre style={{ fontSize: '14px', color: '#9CA3AF', whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', lineHeight: '1.6', margin: 0 }}>{report}</pre>
          )}
        </div>
      )}
    </div>
  );
}

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

  const [selectedMemoryIds, setSelectedMemoryIds] = useState([]);
  const [selectedRagIds, setSelectedRagIds] = useState([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState([]);
  const [showConfig, setShowConfig] = useState(false);

  const [briefingText, setBriefingText] = useState('');
  const [extractedJson, setExtractedJson] = useState({});
  const [extracting, setExtracting] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(true);

  const [agentState, setAgentState] = useState({});
  const [brainOutput, setBrainOutput] = useState('');
  const [brainStatus, setBrainStatus] = useState('idle');
  const [brainError, setBrainError] = useState('');
  const [running, setRunning] = useState(false);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

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
    const nonBrain = agentList.filter(a => a.role !== 'Orchestrator').map(a => a.id);
    setSelectedAgentIds(nonBrain);
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

    if (activeAgents.length === 0) { toast.error('No specialist agents selected'); setRunning(false); return; }

    const currentJson = extractedJsonRef.current;

    let ragChunks = [];
    if (loadedRagDocs.some(d => Array.isArray(d.chunks) && d.chunks.length > 0)) {
      try {
        const queryEmbedding = await getEmbedding(briefingText.slice(0, 600));
        ragChunks = retrieveChunks(loadedRagDocs, queryEmbedding);
      } catch (e) {
        toast.error(`RAG embedding failed (continuing without RAG): ${e.message}`);
      }
    }

    const initialState = {};
    for (const a of activeAgents) initialState[a.id] = { status: 'running', report: '', error: '' };
    setAgentState(initialState);

    const reports = [];
    await Promise.all(
      activeAgents.map(async (agent) => {
        try {
          const { content, tokens } = await runAgent({ agent, briefingText, extractedJson: currentJson, memories: loadedMemories, ragChunks });
          setAgentState(prev => ({ ...prev, [agent.id]: { status: 'done', report: content, error: '' } }));
          reports.push({ agentName: agent.name, agentId: agent.id, content });
          supabase.from('brain_messages').insert({
            session_id: activeSessionId,
            role: `agent_${agent.name.toLowerCase().replace(/\s+/g, '_')}`,
            agent_id: agent.id,
            content,
            model_used: agent.model,
            tokens_used: tokens,
          }).then(({ error }) => { if (error) console.error('Failed to save agent message:', error); });
        } catch (err) {
          const errorMsg = err.message || String(err);
          setAgentState(prev => ({ ...prev, [agent.id]: { status: 'error', report: '', error: errorMsg } }));
          reports.push({ agentName: agent.name, agentId: agent.id, content: `[AGENT FAILED: ${errorMsg}]` });
          console.error(`Agent "${agent.name}" failed:`, err);
        }
      })
    );

    const successfulReports = reports.filter(r => !r.content.startsWith('[AGENT FAILED'));
    if (!brainAgent) { toast.error('No Brain (Orchestrator) agent found — add one in /agents'); setRunning(false); return; }
    if (successfulReports.length === 0) { toast.error('All agents failed — Brain has nothing to synthesize'); setRunning(false); return; }

    setBrainStatus('running');
    try {
      const brainFull = await runBrainStream({
        brainAgent, briefingText, extractedJson: currentJson, reports,
        memories: loadedMemories,
        onChunk: (delta) => setBrainOutput(prev => prev + delta),
      });
      setBrainStatus('done');
      supabase.from('brain_messages').insert({
        session_id: activeSessionId, role: 'agent_brain', agent_id: brainAgent.id,
        content: brainFull, model_used: brainAgent.model,
      }).then(({ error }) => { if (error) console.error('Failed to save Brain message:', error); });
    } catch (err) {
      const errorMsg = err.message || String(err);
      setBrainStatus('error');
      setBrainError(errorMsg);
      console.error('Brain failed:', err);
      toast.error(`Brain failed: ${errorMsg}`);
    }

    setRunning(false);
    const failCount = reports.filter(r => r.content.startsWith('[AGENT FAILED')).length;
    if (failCount > 0) toast.error(`${failCount} agent(s) failed — see reports for details`);
    else toast.success('All agents complete');
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
        session_id: activeSessionId, role: 'assistant', content: full, model_used: 'gpt-4o',
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
      client: client?.name, session_id: activeSessionId,
      extracted_profile: extractedJson, agent_reports: agentReports,
      brain_strategy: brainOutput, exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(client?.name || 'client').replace(/\s+/g, '-').toLowerCase()}-briefing.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const brainAgent = agents.find(a => a.role === 'Orchestrator');
  const specialistAgents = agents.filter(a => a.role !== 'Orchestrator');
  const BrainIcon = ICON_MAP[brainAgent?.icon] || Cpu;
  const selectedSpecialists = specialistAgents.filter(a => selectedAgentIds.includes(a.id));
  const anyAgentRunning = Object.values(agentState).some(s => s.status === 'running');
  const chatMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');

  const exportBtnStyle = {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
    background: 'transparent', color: '#6B7080', border: '1px solid rgba(244,244,246,0.12)',
    borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
        <div className="space-y-3">
          <Link to={`/client/${clientId}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6B7080', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#F4F4F6'}
            onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}>
            <ArrowLeft className="h-4 w-4" /> {client?.name || 'Client'}
          </Link>
          <h1 style={{ fontSize: '36px', fontFamily: 'serif', color: '#F4F4F6', margin: 0 }}>Briefing Studio</h1>
          {client && <p style={{ fontSize: '14px', color: '#6B7080', margin: 0 }}>{client.name}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '24px' }}>
          <button onClick={exportMd} style={exportBtnStyle}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(244,244,246,0.24)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(244,244,246,0.12)'}>
            <Download className="h-3.5 w-3.5" /> .md
          </button>
          <button onClick={exportJson} style={exportBtnStyle}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(244,244,246,0.24)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(244,244,246,0.12)'}>
            <Download className="h-3.5 w-3.5" /> .json
          </button>
        </div>
      </div>

      {/* Session tabs */}
      <div className="space-y-3">
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sessions</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {sessions.map(s => (
            <button key={s.id} onClick={() => activateSession(s)}
              style={{
                padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s',
                ...(s.id === activeSessionId
                  ? { background: '#3362FF', color: '#F4F4F6', border: 'none' }
                  : { background: 'transparent', color: '#6B7080', border: '1px solid rgba(244,244,246,0.12)' }),
              }}>
              {s.title}
            </button>
          ))}
          <button onClick={createSession}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: '1px dashed rgba(244,244,246,0.2)', color: '#6B7080', background: 'transparent', borderRadius: '12px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(244,244,246,0.4)'; e.currentTarget.style.color = '#F4F4F6'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(244,244,246,0.2)'; e.currentTarget.style.color = '#6B7080'; }}>
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
      </div>

      {activeSessionId && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* LEFT: Briefing + config + run panel + reports */}
          <div className="xl:col-span-2 space-y-6">

            {/* Briefing input */}
            <div style={{ ...panelCard, padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '12px', fontWeight: '700', color: '#F4F4F6', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Client Briefing</h2>
                <button onClick={() => setShowConfig(o => !o)}
                  style={{ fontSize: '12px', color: '#6B7080', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#F4F4F6'}
                  onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}>
                  {showConfig ? 'Hide config' : 'Configure agents & memory'}
                </button>
              </div>
              <textarea
                value={briefingText}
                onChange={e => setBriefingText(e.target.value)}
                rows={8}
                style={di}
                placeholder="Paste the full client briefing — call notes, WhatsApp messages, emails. The more context the better…"
                onFocus={e => e.target.style.borderColor = 'rgba(51,98,255,0.5)'}
                onBlur={e => { e.target.style.borderColor = 'rgba(244,244,246,0.12)'; saveBriefingToDb(); }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                <button onClick={extract} disabled={extracting || !briefingText.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'transparent', color: '#6B7080', border: '1px solid rgba(244,244,246,0.12)', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', opacity: (extracting || !briefingText.trim()) ? 0.5 : 1 }}
                  onMouseEnter={e => { if (!extracting && briefingText.trim()) e.currentTarget.style.color = '#F4F4F6'; }}
                  onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}>
                  <Sparkles className="h-4 w-4" />
                  {extracting ? 'Extracting…' : 'Extract Profile'}
                </button>
                <button onClick={runAllAgents} disabled={running || !briefingText.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#3362FF', color: '#F4F4F6', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: (running || !briefingText.trim()) ? 'not-allowed' : 'pointer', opacity: (running || !briefingText.trim()) ? 0.5 : 1 }}>
                  <Zap className="h-4 w-4" />
                  {running ? 'Running…' : 'Run All Agents'}
                </button>
              </div>
            </div>

            {/* Config panel */}
            {showConfig && (
              <div style={{ ...panelCard, padding: '24px' }} className="space-y-6">
                <h2 style={{ fontSize: '12px', fontWeight: '700', color: '#F4F4F6', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Configuration</h2>

                <div className="space-y-3">
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#6B7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Agents</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {specialistAgents.map(a => {
                      const Icon = ICON_MAP[a.icon] || Bot;
                      const active = selectedAgentIds.includes(a.id);
                      return (
                        <button key={a.id}
                          onClick={() => setSelectedAgentIds(prev => active ? prev.filter(id => id !== a.id) : [...prev, a.id])}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                            ...(active
                              ? { backgroundColor: a.color, color: '#F4F4F6', borderColor: 'transparent' }
                              : { background: 'transparent', color: '#6B7080', borderColor: 'rgba(244,244,246,0.12)' }),
                          }}>
                          <Icon style={{ width: '14px', height: '14px' }} />
                          {a.name}
                          {active && <Check style={{ width: '12px', height: '12px' }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#6B7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Memory Buckets</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {memories.length === 0
                      ? <span style={{ fontSize: '12px', color: '#6B7080' }}>No memory buckets — create some in /memory.</span>
                      : memories.map(m => {
                          const active = selectedMemoryIds.includes(m.id);
                          return (
                            <button key={m.id}
                              onClick={() => setSelectedMemoryIds(prev => active ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                              style={{
                                padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                                ...(active
                                  ? { background: '#3362FF', color: '#F4F4F6', borderColor: 'transparent' }
                                  : { background: 'transparent', color: '#6B7080', borderColor: 'rgba(244,244,246,0.12)' }),
                              }}>
                              {m.name}{active ? ' ✓' : ''}
                            </button>
                          );
                        })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#6B7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>RAG Documents</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {ragDocs.filter(d => d.embedding_status === 'done').length === 0
                      ? <span style={{ fontSize: '12px', color: '#6B7080' }}>No embedded RAG docs — add and embed some in /rag.</span>
                      : ragDocs.filter(d => d.embedding_status === 'done').map(d => {
                          const active = selectedRagIds.includes(d.id);
                          return (
                            <button key={d.id}
                              onClick={() => setSelectedRagIds(prev => active ? prev.filter(id => id !== d.id) : [...prev, d.id])}
                              style={{
                                padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                                ...(active
                                  ? { background: '#3362FF', color: '#F4F4F6', borderColor: 'transparent' }
                                  : { background: 'transparent', color: '#6B7080', borderColor: 'rgba(244,244,246,0.12)' }),
                              }}>
                              {d.title}{active ? ' ✓' : ''}
                            </button>
                          );
                        })}
                  </div>
                </div>
              </div>
            )}

            {/* Live status panel */}
            {Object.keys(agentState).length > 0 && (
              <div style={{ ...panelCard, padding: '24px' }} className="space-y-4">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: '12px', fontWeight: '700', color: '#F4F4F6', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Agent Status</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#6B7080' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 style={{ width: '12px', height: '12px', color: '#22C55E' }} /> {Object.values(agentState).filter(s => s.status === 'done').length} done</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle style={{ width: '12px', height: '12px', color: '#FF3B5C' }} /> {Object.values(agentState).filter(s => s.status === 'error').length} failed</span>
                    {anyAgentRunning && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3362FF' }}><Clock style={{ width: '12px', height: '12px' }} /> running…</span>}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {selectedSpecialists.map(a => (
                    <AgentStatusRow key={a.id} agent={a} status={agentState[a.id]?.status || 'idle'} errorMsg={agentState[a.id]?.error} />
                  ))}
                </div>
                {/* Brain row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
                  ...(brainStatus === 'running' ? { border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)' } :
                      brainStatus === 'done'    ? { border: '1px solid rgba(34,197,94,0.3)',  background: 'rgba(34,197,94,0.08)' } :
                      brainStatus === 'error'   ? { border: '1px solid rgba(255,59,92,0.3)',  background: 'rgba(255,59,92,0.08)' } :
                      { border: '1px solid rgba(244,244,246,0.08)', background: 'rgba(244,244,246,0.03)' }),
                }}>
                  <div style={{ height: '28px', width: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: (brainAgent?.color || '#8b5cf6') + '22' }}>
                    {brainStatus === 'running'
                      ? <div className="animate-spin" style={{ height: '14px', width: '14px', border: `2px solid ${brainAgent?.color || '#8b5cf6'}`, borderTopColor: 'transparent', borderRadius: '99px' }} />
                      : <BrainIcon style={{ width: '14px', height: '14px', color: brainAgent?.color || '#8b5cf6' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#F4F4F6' }}>
                      Brain {brainStatus === 'running' ? '— synthesizing…' : brainStatus === 'done' ? '— complete' : brainStatus === 'error' ? '— failed' : '— waiting for agents'}
                    </div>
                    {brainStatus === 'error' && <div style={{ fontSize: '10px', color: '#FF3B5C', marginTop: '2px' }}>{brainError}</div>}
                  </div>
                  {STATUS_ICON[brainStatus]}
                </div>
              </div>
            )}

            {/* Agent reports */}
            {Object.keys(agentState).length > 0 && (
              <div className="space-y-4">
                <h2 style={{ fontSize: '12px', fontWeight: '700', color: '#F4F4F6', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Agent Reports</h2>
                {selectedSpecialists.map(agent => {
                  const s = agentState[agent.id];
                  if (!s) return null;
                  return <AgentReportCard key={agent.id} agent={agent} report={s.report} status={s.status} errorMsg={s.error} />;
                })}
              </div>
            )}

            {/* Brain output */}
            {(brainOutput || brainStatus === 'running') && (
              <div style={{ borderRadius: '16px', overflow: 'hidden', border: `2px solid ${brainAgent?.color || '#8b5cf6'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 24px', borderBottom: '1px solid rgba(244,244,246,0.07)', backgroundColor: (brainAgent?.color || '#8b5cf6') + '11' }}>
                  <div style={{ height: '32px', width: '32px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: (brainAgent?.color || '#8b5cf6') + '22' }}>
                    {brainStatus === 'running'
                      ? <div className="animate-spin" style={{ height: '16px', width: '16px', border: `2px solid ${brainAgent?.color || '#8b5cf6'}`, borderTopColor: 'transparent', borderRadius: '99px' }} />
                      : <BrainIcon style={{ width: '16px', height: '16px', color: brainAgent?.color || '#8b5cf6' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: brainAgent?.color || '#8b5cf6' }}>Brain — Orchestrator</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#F4F4F6' }}>
                      {brainStatus === 'running' ? 'Synthesizing…' : 'Unified Strategy'}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '20px 24px', background: 'rgba(244,244,246,0.02)' }}>
                  <pre style={{ fontSize: '14px', color: '#9CA3AF', whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', lineHeight: '1.6', margin: 0 }}>
                    {brainOutput || <span style={{ fontStyle: 'italic', color: '#6B7080' }} className="animate-pulse">Brain is thinking…</span>}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Client profile JSON + chat */}
          <div className="space-y-6">

            {/* JSON profile */}
            <div style={{ ...panelCard, overflow: 'hidden' }}>
              <button onClick={() => setJsonOpen(o => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,244,246,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#F4F4F6', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Client Profile</div>
                {jsonOpen ? <ChevronUp style={{ width: '16px', height: '16px', color: '#6B7080' }} /> : <ChevronDown style={{ width: '16px', height: '16px', color: '#6B7080' }} />}
              </button>
              {jsonOpen && (
                <div style={{ borderTop: '1px solid rgba(244,244,246,0.07)' }}>
                  {Object.keys(extractedJson).length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: '14px', color: '#6B7080' }}>
                      Paste a briefing and click <strong style={{ color: '#9CA3AF' }}>Extract Profile</strong>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '384px', overflowY: 'auto' }}>
                      {Object.entries(extractedJson).map(([key, val]) => (
                        <div key={key} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(244,244,246,0.05)' }}>
                          <div style={{ fontSize: '10px', fontWeight: '700', color: '#6B7080', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div style={{ fontSize: '14px', color: '#F4F4F6' }}>
                            {Array.isArray(val)
                              ? val.length === 0
                                ? <span style={{ color: '#6B7080', fontStyle: 'italic' }}>—</span>
                                : typeof val[0] === 'object'
                                  ? <pre style={{ fontSize: '12px', color: '#9CA3AF', whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(val, null, 2)}</pre>
                                  : val.join(', ')
                              : typeof val === 'object' && val !== null
                                ? <pre style={{ fontSize: '12px', color: '#9CA3AF', whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(val, null, 2)}</pre>
                                : val || <span style={{ color: '#6B7080', fontStyle: 'italic' }}>—</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat */}
            <div style={{ ...panelCard, display: 'flex', flexDirection: 'column', height: '560px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(244,244,246,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#F4F4F6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Ask Brain</div>
                  <div style={{ fontSize: '12px', color: '#6B7080' }}>Uses all context above</div>
                </div>
                <button onClick={() => setMessages([])}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6B7080', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#F4F4F6'}
                  onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}>
                  <RefreshCcw className="h-3 w-3" />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {chatMessages.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', textAlign: 'center' }}>
                    <Cpu style={{ width: '32px', height: '32px', color: '#6B7080' }} />
                    <p style={{ fontSize: '12px', color: '#6B7080', maxWidth: '200px', margin: 0 }}>
                      Ask about pages, sections, CTAs, SEO, copy — Brain knows this client.
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '90%', borderRadius: '16px', padding: '10px 14px', fontSize: '12px', lineHeight: '1.6',
                      ...(msg.role === 'user'
                        ? { background: '#3362FF', color: '#F4F4F6', borderBottomRightRadius: '4px' }
                        : { background: 'rgba(244,244,246,0.06)', color: '#F4F4F6', borderBottomLeftRadius: '4px' }),
                    }}>
                      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', margin: 0 }}>{msg.content}</pre>
                    </div>
                  </div>
                ))}
                {chatting && streamingContent && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ maxWidth: '90%', background: 'rgba(244,244,246,0.06)', borderRadius: '16px', borderBottomLeftRadius: '4px', padding: '10px 14px' }}>
                      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', fontSize: '12px', color: '#F4F4F6', margin: 0 }}>{streamingContent}</pre>
                    </div>
                  </div>
                )}
                {chatting && !streamingContent && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ background: 'rgba(244,244,246,0.06)', borderRadius: '16px', borderBottomLeftRadius: '4px', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[0,1,2].map(i => <div key={i} className="animate-bounce" style={{ height: '6px', width: '6px', background: '#6B7080', borderRadius: '99px', animationDelay: `${i * 0.15}s` }} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={sendChat} style={{ padding: '12px', borderTop: '1px solid rgba(244,244,246,0.07)', display: 'flex', gap: '8px', flexShrink: 0 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  disabled={chatting}
                  placeholder="How many sections for the home page?"
                  style={{ ...di, resize: undefined, lineHeight: undefined, flex: 1, padding: '8px 12px', fontSize: '12px', opacity: chatting ? 0.5 : 1 }}
                  onFocus={e => e.target.style.borderColor = 'rgba(51,98,255,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(244,244,246,0.12)'}
                />
                <button type="submit" disabled={!chatInput.trim() || chatting}
                  style={{ height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3362FF', color: '#F4F4F6', border: 'none', borderRadius: '12px', cursor: 'pointer', opacity: (!chatInput.trim() || chatting) ? 0.4 : 1, flexShrink: 0 }}>
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {!activeSessionId && sessions.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0', gap: '16px', textAlign: 'center' }}>
          <Sparkles style={{ width: '40px', height: '40px', color: '#6B7080' }} />
          <p style={{ color: '#6B7080', fontWeight: '500', margin: 0 }}>No briefing sessions yet.</p>
          <button onClick={createSession}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#3362FF', color: '#F4F4F6', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
            <Plus className="h-4 w-4" /> Start First Briefing
          </button>
        </div>
      )}
    </div>
  );
}
