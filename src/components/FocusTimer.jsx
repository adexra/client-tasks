import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, X, Target, CheckCircle2 } from 'lucide-react';
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
    <div
      className="group"
      style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        background: 'rgba(244,244,246,0.04)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(244,244,246,0.1)', borderRadius: '99px',
        padding: '8px 20px', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,244,246,0.07)'; e.currentTarget.style.borderColor = 'rgba(244,244,246,0.16)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(244,244,246,0.04)'; e.currentTarget.style.borderColor = 'rgba(244,244,246,0.1)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid rgba(244,244,246,0.1)', paddingRight: '16px', flexShrink: 0 }}>
        <span style={{
          fontSize: '14px', fontFamily: 'monospace', fontWeight: '700', letterSpacing: '-0.02em', width: '48px', textAlign: 'center',
          color: isActive ? '#F4F4F6' : '#6B7080',
        }}
          className={isActive ? 'animate-pulse' : ''}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={toggle}
            style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7080', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#F4F4F6'}
            onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}>
            {isActive ? <Pause style={{ width: '14px', height: '14px' }} /> : <Play style={{ width: '14px', height: '14px' }} />}
          </button>
          <button onClick={handleStopAndLog}
            style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7080', opacity: 0, transition: 'all 0.15s' }}
            title={t('timer.stop_title')}
            className="group-hover:opacity-100"
            onMouseEnter={e => e.currentTarget.style.color = '#FF3B5C'}
            onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}>
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px', flex: 1 }}>
        {isCompleted ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22C55E' }} className="animate-in fade-in slide-in-from-left-2">
            <CheckCircle2 style={{ width: '14px', height: '14px' }} />
            <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('timer.completed')}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Target style={{ width: '12px', height: '12px', color: '#6B7080', flexShrink: 0 }} />
            <input
              type="text"
              placeholder={t('timer.placeholder')}
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none', padding: 0,
                fontSize: '11px', fontWeight: '500', color: '#F4F4F6', width: '100%',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
