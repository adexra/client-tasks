import { cn } from '../lib/utils';

export default function TagBadge({ tag, onRemove }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 bg-neutral-50 border border-neutral-100 text-neutral-400 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all duration-300"
    )}>
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="opacity-40 hover:opacity-100 transition-opacity ml-1 bg-neutral-200 rounded-full h-3 w-3 flex items-center justify-center font-bold"
        >
          ×
        </button>
      )}
    </span>
  );
}
