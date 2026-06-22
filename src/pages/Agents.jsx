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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#6B7080', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Brain System</span>
            <div style={{ height: '1px', width: '32px', background: 'rgba(244,244,246,0.1)' }} />
          </div>
          <h1 style={{ fontSize: '60px', fontFamily: 'serif', color: '#F4F4F6', lineHeight: '1.1', margin: 0 }}>Agents</h1>
          <p style={{ color: '#6B7080', fontSize: '16px', lineHeight: '1.6', maxWidth: '480px', margin: 0 }}>
            Each agent is a specialist with its own system prompt, model, and role. They run in parallel and report to Brain.
          </p>
        </div>
        <button
          onClick={createAgent}
          disabled={creating}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: '#3362FF', color: '#F4F4F6', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.5 : 1 }}
        >
          <Plus className="h-4 w-4" />
          New Agent
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: '208px', borderRadius: '16px', background: 'rgba(244,244,246,0.03)' }} className="animate-pulse" />
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
                className="group flex flex-col gap-4"
                style={{
                  position: 'relative',
                  background: '#0D0F1E',
                  border: '1px solid rgba(244,244,246,0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(244,244,246,0.16)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(1,2,14,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(244,244,246,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ height: '40px', width: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: agent.color + '22' }}>
                    <Icon style={{ width: '20px', height: '20px', color: agent.color }} />
                  </div>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: '700', padding: '4px 8px', borderRadius: '8px', background: 'rgba(244,244,246,0.06)', color: '#6B7080' }}>
                    {MODEL_LABELS[agent.model] || agent.model}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#6B7080', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>{agent.role}</div>
                  <h3 style={{ fontSize: '20px', fontFamily: 'serif', color: '#F4F4F6', margin: '0 0 8px 0' }}>{agent.name}</h3>
                  <p style={{ fontSize: '14px', color: '#6B7080', lineHeight: '1.5', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{agent.description}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '500', color: '#6B7080', transition: 'color 0.2s' }}
                  className="group-hover:text-[#F4F4F6]">
                  Edit agent <ChevronRight style={{ width: '14px', height: '14px' }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
