import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, placeholder, style = {}, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', ...style }} className={className}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
          background: 'rgba(244,244,246,0.04)', border: `1px solid ${open ? 'rgba(51,98,255,0.5)' : 'rgba(244,244,246,0.1)'}`,
          borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: selected ? '#F4F4F6' : '#6B7080', cursor: 'pointer',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? placeholder ?? value}
        </span>
        <ChevronDown style={{ width: 12, height: 12, color: '#6B7080', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 300, minWidth: '100%',
          background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.15)', borderRadius: '10px',
          overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
        }}>
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: '13px', whiteSpace: 'nowrap',
                color: String(o.value) === String(value) ? '#F4F4F6' : '#6B7080',
                background: String(o.value) === String(value) ? 'rgba(51,98,255,0.15)' : 'transparent',
                border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={e => { if (String(o.value) !== String(value)) e.currentTarget.style.background = 'rgba(244,244,246,0.05)'; }}
              onMouseLeave={e => { if (String(o.value) !== String(value)) e.currentTarget.style.background = 'transparent'; }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
