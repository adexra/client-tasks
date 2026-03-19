import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Rocket, 
  CalendarDays, 
  Inbox, 
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Target,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import TagBadge from '../components/TagBadge';
import { useToast } from '../context/ToastContext';
import TaskModal from '../components/TaskModal';

const BUCKETS = {
  active_project: { id: 'active_project', label: 'Projetos Ativos', icon: Rocket },
  this_week:      { id: 'this_week',      label: 'Execução Semanal', icon: CalendarDays },
  backlog:       { id: 'backlog',       label: 'Backlog', icon: Inbox },
  done:          { id: 'done',          label: 'Concluído', icon: CheckCircle2 },
};

const PRIORITY_META = {
  high:     { label: 'Crítico',  color: 'text-rose-500',   bg: 'bg-rose-50',  weight: 3 },
  medium:   { label: 'Alto',      color: 'text-amber-500',  bg: 'bg-amber-50', weight: 2 },
  low:      { label: 'Suporte',   color: 'text-neutral-400', bg: 'bg-neutral-50', weight: 1 },
  very_low: { label: 'Interno',  color: 'text-neutral-300', bg: 'bg-neutral-50', weight: 0 },
};

export default function PriorityView() {
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, task: null });
  const [completionModal, setCompletionModal] = useState({ open: false, task: null });
  const toast = useToast();

  async function load() {
    setLoading(true);
    const [cRes, tRes] = await Promise.all([
      supabase.from('clients').select('*').eq('status', 'active'),
      supabase.from('tasks').select('*, clients(name)').order('created_at', { ascending: false })
    ]);
    if (!cRes.error) setClients(cRes.data || []);
    
    if (!tRes.error) {
       const sorted = (tRes.data || []).sort((a, b) => {
         if (a.done !== b.done) return a.done ? 1 : -1;
         const pA = PRIORITY_META[a.priority]?.weight || 0;
         const pB = PRIORITY_META[b.priority]?.weight || 0;
         if (pA !== pB) return pB - pA;
         return new Date(b.created_at) - new Date(a.created_at);
       });
       setTasks(sorted);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateTaskBucket(taskId, bucket) {
    const { error } = await supabase.from('tasks').update({ bucket }).eq('id', taskId);
    if (!error) load();
    else toast.error('Falha na atualização.');
  }

  async function toggleDone(task) {
    if (!task.done) {
      // Opening completion modal instead of immediate toggle
      setCompletionModal({ open: true, task });
      return;
    }
    const { error } = await supabase.from('tasks').update({ done: false, actual_minutes: null }).eq('id', task.id);
    if (!error) load();
  }

  async function completeTask(taskId, minutes) {
    const { error } = await supabase.from('tasks').update({ 
      done: true, 
      actual_minutes: parseInt(minutes) || 0 
    }).eq('id', taskId);
    
    if (!error) {
      setCompletionModal({ open: false, task: null });
      load();
      toast.success('Tarefa finalizada');
    }
  }

  const todayTasks = tasks.filter(t => t.bucket === 'today' && !t.done);
  const weekTasks = tasks.filter(t => (t.bucket === 'this_week' || t.bucket === 'today') && !t.done);
  const backlogTasks = tasks.filter(t => t.bucket === 'backlog' && !t.done);
  const doneTasks = tasks.filter(t => t.done);
  
  const isTodayOverloaded = todayTasks.length > 5;

  return (
    <div className="space-y-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Quadro de Execução</span>
              <div className="h-[1px] w-8 bg-neutral-200" />
           </div>
           <h1 className="text-3xl xs:text-4xl md:text-5xl lg:text-6xl font-serif text-[var(--ink-primary)] leading-tight tracking-tight break-words">
             Projetos.
           </h1>
           <p className="text-neutral-500 font-medium max-w-lg text-base leading-relaxed">
             Impulsionando a execução. Eliminando o ruído. 
             Focando em tarefas de alto impacto.
           </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           <div className={cn(
             "px-4 sm:px-6 py-2 sm:py-3 rounded-xl border text-[9px] sm:text-[10px] font-bold tracking-[0.1em] uppercase flex items-center gap-2 sm:gap-3 transition-colors",
             isTodayOverloaded ? "border-rose-100 bg-rose-50 text-rose-500" : "border-neutral-100 text-neutral-400"
           )}>
             <Target className="h-4 w-4" />
             <span className="hidden xs:inline">Carga de Tarefas:</span> {todayTasks.length} / 5
           </div>
           
           <button 
             onClick={() => setModal({ open: true, task: null })}
             className="btn-minimal btn-primary flex items-center gap-2.5 h-10 sm:h-12 px-6 sm:px-8"
           >
             <Plus className="h-4 w-4" /> 
             <span className="text-sm font-medium">Nova Tarefa</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 items-start">
        {/* Mandate Register */}
        <Column label={BUCKETS.active_project.label} icon={BUCKETS.active_project.icon}>
           <div className="space-y-6">
              {clients.map(client => (
                <ClientMinimalCard key={client.id} client={client} />
              ))}
              {clients.length === 0 && <p className="text-xs text-neutral-300 italic text-center py-20 uppercase tracking-widest">Nenhum projeto ativo.</p>}
           </div>
        </Column>

        {/* Execution Pipeline */}
        <Column label={BUCKETS.this_week.label} icon={BUCKETS.this_week.icon}>
          <div className="space-y-12">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                 <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.1em]">Tarefas de Hoje</p>
                 {isTodayOverloaded && <span className="text-[8px] font-bold text-rose-500 uppercase">Atenção Necessária</span>}
              </div>
              <div className="space-y-4">
                {todayTasks.map(task => (
                  <TaskEditorialCard key={task.id} task={task} onMove={updateTaskBucket} onEdit={t => setModal({ open: true, task: t })} onToggleDone={toggleDone} />
                ))}
                {todayTasks.length === 0 && (
                  <div className="py-20 border-2 border-dashed border-neutral-100 rounded-2xl flex flex-col items-center justify-center text-neutral-200">
                     <p className="text-[10px] font-bold uppercase tracking-[0.2em] italic">Nenhuma tarefa para hoje.</p>
                  </div>
                )}
              </div>
           </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                 <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.1em]">Tarefas Semanais</p>
              </div>
              <div className="space-y-4">
                {tasks.filter(t => t.bucket === 'this_week' && !t.done).map(task => (
                  <TaskEditorialCard key={task.id} task={task} onMove={updateTaskBucket} onEdit={t => setModal({ open: true, task: t })} onToggleDone={toggleDone} />
                ))}
              </div>
            </div>
          </div>
        </Column>

        {/* Operational Archive */}
        <Column label={BUCKETS.backlog.label} icon={BUCKETS.backlog.icon}>
          <div className="space-y-4">
            {backlogTasks.map(task => (
              <TaskEditorialCard key={task.id} task={task} onMove={updateTaskBucket} onEdit={t => setModal({ open: true, task: t })} onToggleDone={toggleDone} />
            ))}
            {backlogTasks.length === 0 && (
               <div className="py-20 border-2 border-dashed border-neutral-100 rounded-2xl flex items-center justify-center text-neutral-200 uppercase tracking-widest text-[9px] italic">Backlog Limpo</div>
            )}
          </div>
        </Column>

        {/* Finished Stream */}
        <Column label={BUCKETS.done.label} icon={BUCKETS.done.icon}>
          <div className="space-y-4">
            {doneTasks.map(task => (
              <TaskEditorialCard key={task.id} task={task} onMove={updateTaskBucket} onEdit={t => setModal({ open: true, task: t })} onToggleDone={toggleDone} />
            ))}
            {doneTasks.length === 0 && (
               <div className="py-20 border-2 border-dashed border-neutral-100 rounded-2xl flex items-center justify-center text-neutral-200 uppercase tracking-widest text-[9px] italic">Nenhuma finalização.</div>
            )}
          </div>
        </Column>
      </div>

      <TaskModal 
        isOpen={modal.open} 
        onClose={() => setModal({ open: false, task: null })} 
        editTask={modal.task}
        clients={clients}
        onTaskSaved={load}
      />

      <TaskCompletionModal 
        isOpen={completionModal.open}
        onClose={() => setCompletionModal({ open: false, task: null })}
        onComplete={completeTask}
        task={completionModal.task}
      />
    </div>
  );
}

function Column({ label, icon: Icon, children }) {
  return (
    <div className="space-y-10 min-h-[600px]">
      <div className="flex items-center gap-4">
        <Icon className="h-4 w-4 text-neutral-300" />
        <h2 className="text-xl font-serif text-[var(--ink-primary)]">{label}.</h2>
      </div>
      <div className="px-1">
        {children}
      </div>
    </div>
  );
}

function ClientMinimalCard({ client }) {
  return (
    <Link to={`/client/${client.id}`} className="block group">
      <div className="surface-card surface-card-hover p-6 md:p-8 space-y-4 transition-all">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-serif text-[var(--ink-primary)] group-hover:text-black transition-colors truncate">{client.name}</h3>
          <ChevronRight className="h-4 w-4 text-neutral-200 group-hover:text-neutral-400 transition-transform group-hover:translate-x-1" />
        </div>
        
        {client.next_action && (
           <div className="pt-4 border-t border-neutral-50">
             <p className="text-xs font-medium text-neutral-400 leading-snug italic">{client.next_action}</p>
           </div>
        )}
        
        <div className="flex flex-wrap gap-1.5">
           {client.tags?.slice(0, 2).map(t => <TagBadge key={t} tag={t} />)}
        </div>
      </div>
    </Link>
  );
}

const CLIENT_ACCENTS = [
  'border-indigo-200',
  'border-amber-200',
  'border-emerald-200',
  'border-rose-200',
  'border-fuchsia-200',
  'border-cyan-200',
  'border-orange-200',
  'border-slate-300'
];

function TaskEditorialCard({ task, onMove, onEdit, onToggleDone }) {
  const p = PRIORITY_META[task.priority] || PRIORITY_META.low;
  
  // Deterministic accent color based on client_id string
  const getAccent = (id) => {
    if (!id) return 'border-neutral-100';
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return CLIENT_ACCENTS[sum % CLIENT_ACCENTS.length];
  };

  const accentClass = getAccent(task.client_id);
  
  return (
    <div className={cn(
      "surface-card p-6 flex items-start gap-4 group transition-all border-l-4",
      accentClass,
      task.done && "opacity-40 grayscale-[0.5]"
    )}>
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleDone(task); }}
        className={cn(
          "mt-1 h-5 w-5 rounded border flex items-center justify-center transition-all duration-300 shrink-0",
          task.done 
            ? "bg-[var(--success-green)] border-[var(--success-green)]" 
            : "border-neutral-200 bg-neutral-50 hover:border-neutral-400"
        )}
      >
        {task.done && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
      </button>
      
      <div className="flex-1 min-w-0" onClick={() => onEdit(task)}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className={cn(
            "text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-[0.1em] border transition-all", 
            p.bg, p.color, "border-neutral-100"
          )}>
            {p.label}
          </span>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {['today', 'this_week', 'backlog'].filter(b => b !== task.bucket).map(b => (
              <button 
                key={b}
                onClick={(e) => { e.stopPropagation(); onMove(task.id, b); }} 
                className="text-[8px] font-bold text-neutral-400 hover:text-neutral-600 uppercase tracking-widest px-1.5 py-0.5 border border-neutral-100 rounded bg-white shadow-sm"
              >
                {b === 'this_week' ? 'Semana' : b === 'backlog' ? 'Arquivo' : 'Hoje'}
              </button>
            ))}
          </div>
        </div>
        
        <p className={cn(
          "text-sm font-medium leading-normal tracking-tight transition-all", 
          task.done ? "text-neutral-400" : "text-[var(--ink-primary)]"
        )}>{task.title}</p>
        
        <div className="flex items-center justify-between mt-3">
          {task.clients?.name && (
            <p className={cn(
              "text-[9px] font-bold uppercase tracking-widest",
              task.done ? "text-neutral-300" : "text-neutral-400"
            )}>
              {task.clients.name}
            </p>
          )}
          {task.actual_minutes && (
            <span className="text-[9px] font-mono text-neutral-300">
              {task.actual_minutes}m
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskCompletionModal({ isOpen, onClose, onComplete, task }) {
  const [minutes, setMinutes] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm surface-card p-12 space-y-10 shadow-2xl border-neutral-100">
        <div className="space-y-4 text-center">
           <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
           </div>
           <h3 className="text-3xl font-serif text-[var(--ink-primary)]">Bom Trabalho!</h3>
           <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Tarefa Concluída</p>
        </div>

        <div className="space-y-8">
           <div className="space-y-3">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Quanto tempo levou realmente?</label>
              <div className="relative">
                <input 
                  type="number"
                  autoFocus
                  value={minutes}
                  onChange={e => setMinutes(e.target.value)}
                  placeholder="Minutos"
                  className="w-full bg-neutral-50/50 border border-neutral-100 rounded-xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-neutral-200 transition-all"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-300 uppercase">min</span>
              </div>
           </div>

           <div className="p-6 bg-amber-50/30 border border-amber-100 rounded-xl flex items-start gap-4">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[11px] font-medium text-amber-900 leading-relaxed italic">
                Lembre-se de rodar o <span className="font-bold underline decoration-amber-200 decoration-2 font-not-italic">Checklist de QA de Entrega</span> antes da liberação final.
              </p>
           </div>
        </div>

        <div className="flex flex-col gap-3">
           <button 
             onClick={() => onComplete(task.id, minutes)}
             className="w-full btn-minimal h-14 bg-ink-charcoal text-white hover:bg-black flex items-center justify-center gap-3 transition-all cursor-pointer"
           >
              <span className="text-xs font-bold uppercase tracking-widest">Finalizar Tarefa</span>
              <TrendingUp className="h-4 w-4" />
           </button>
           <button onClick={onClose} className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-300 hover:text-black transition-all">
              Cancelar
           </button>
        </div>
      </div>
    </div>
  );
}
