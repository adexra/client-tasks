import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Bot, Code, PenTool, TrendingUp, Layout, Plus, ChevronRight, Cpu } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const ICON_MAP = { Brain: Cpu, Code, PenTool, TrendingUp, Layout, Bot };
const MODEL_LABELS = { 'gpt-4o': 'GPT-4o', 'gpt-4o-mini': 'GPT-4o mini' };

export default function Agents() {
  const toast = useToast();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => { load() }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('brain_agents').select('*').order('created_at');
    if (!error) setAgents(data || []);
    setLoading(false);
  }

  async function createAgent() {
    setCreating(true);
    const { data, error } = await supabase.from('brain_agents').insert({
      name: 'New Agent',
      role: 'Specialist',
      description: 'Describe this agent\'s role.',
      system_prompt: 'You are a specialist agent. Define your expertise here.',
      model: 'gpt-4o-mini',
      color: '#6366f1',
      icon: 'Bot',
    }).select().single();
    setCreating(false);
    if (error) { toast.error('Failed to create agent'); return; }
    setAgents(prev => [...prev, data]);
    toast.success('Agent created');
  }

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Brain System</span>
            <div className="h-[1px] w-8 bg-neutral-200" />
          </div>
          <h1 className="text-6xl font-serif text-ink-primary leading-tight tracking-tight">Agents</h1>
          <p className="text-neutral-500 font-medium max-w-lg text-base leading-relaxed">
            Each agent is a specialist with its own system prompt, model, and role. They run in parallel and report to Brain.
          </p>
        </div>
        <button
          onClick={createAgent}
          disabled={creating}
          className="flex items-center gap-2 px-5 py-3 bg-ink-primary text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          New Agent
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-52 rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map(agent => {
            const Icon = ICON_MAP[agent.icon] || Bot;
            return (
              <Link
                key={agent.id}
                to={`/agents/${agent.id}`}
                className="group relative bg-white border border-border-light rounded-2xl p-6 hover:border-neutral-300 hover:shadow-md transition-all duration-200 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: agent.color + '22' }}
                  >
                    <Icon className="h-5 w-5" style={{ color: agent.color }} />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-neutral-100 text-neutral-500">
                    {MODEL_LABELS[agent.model] || agent.model}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em] mb-1">{agent.role}</div>
                  <h3 className="text-xl font-serif text-ink-primary mb-2">{agent.name}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2">{agent.description}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-neutral-400 group-hover:text-ink-primary transition-colors">
                  Edit agent <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
