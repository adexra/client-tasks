export default function TagBadge({ tag, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all duration-300"
      style={{
        background: 'rgba(51,98,255,0.1)',
        border: '1px solid rgba(51,98,255,0.2)',
        color: '#818cf8',
      }}
    >
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="transition-all ml-0.5 rounded-full h-3 w-3 flex items-center justify-center font-bold"
          style={{ color: 'rgba(129,140,248,0.6)', background: 'rgba(51,98,255,0.15)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#FF3B5C'; e.currentTarget.style.background = 'rgba(255,59,92,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(129,140,248,0.6)'; e.currentTarget.style.background = 'rgba(51,98,255,0.15)'; }}
        >
          ×
        </button>
      )}
    </span>
  );
}
