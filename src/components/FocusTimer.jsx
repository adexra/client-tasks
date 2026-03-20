import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, X, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export default function FocusTimer({ onLog }) {
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [isActive, setIsActive] = useState(false);
  const [intent, setIntent] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const toast = useToast();

  const toggle = () => setIsActive(!isActive);

  const reset = useCallback(() => {
    setIsActive(false);
    setTimeLeft(15 * 60);
    setIsCompleted(false);
  }, []);

  const handleStopAndLog = () => {
    setIsActive(false);
    onLog({
      title: intent || t('timer.objective'),
      minutes: Math.ceil((15 * 60 - timeLeft) / 60)
    });
    reset();
  };

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setIsCompleted(true);
      toast.success(t('timer.completed'));
      handleStopAndLog();
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, toast, t]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex items-center gap-2 sm:gap-6 bg-white/50 backdrop-blur-sm border border-border-light rounded-full px-3 sm:px-5 py-2 group transition-all hover:bg-white hover:shadow-sm min-w-0">
      <div className="flex items-center gap-2 sm:gap-3 border-r border-border-light pr-2 sm:pr-4 shrink-0">
        <div className="relative flex items-center justify-center">
            <span className={cn(
              "text-sm font-mono font-bold tracking-tight w-12 text-center",
              isActive ? "text-ink-charcoal animate-pulse" : "text-ink-muted"
            )}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={toggle}
            className="p-1 hover:text-ink-charcoal text-ink-muted transition-colors"
          >
            {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button 
            onClick={handleStopAndLog}
            className="p-1 hover:text-rose-500 text-ink-muted opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
            title={t('timer.stop_title')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 min-w-[100px] sm:min-w-[200px] flex-1">
        {isCompleted ? (
          <div className="flex items-center gap-2 text-success-green animate-in fade-in slide-in-from-left-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{t('timer.completed')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <Target className="h-3 w-3 text-ink-muted shrink-0" />
            <input 
              type="text"
              placeholder={t('timer.placeholder')}
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="bg-transparent border-none p-0 text-[11px] font-medium placeholder:text-ink-placeholder focus:ring-0 w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
