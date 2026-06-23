import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";

export default function ObjectiveEditor({ value, placeholder, onSave, className }: {
  value: string;
  placeholder: string;
  onSave: (text: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value.trim()) onSave(trimmed);
  };

  if (editing) {
    return (
      <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        placeholder={placeholder} rows={2}
        className={`w-full bg-slate-900/80 border border-[#09a1e5]/40 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-[#09a1e5] resize-none ${className ?? ""}`}
      />
    );
  }

  return (
    <button onClick={() => setEditing(true)}
      className={`group flex items-start gap-1.5 text-left w-full rounded-lg px-1 py-0.5 -mx-1 hover:bg-white/[0.04] transition-colors ${className ?? ""}`}>
      <span className={`text-xs flex-1 ${value ? "text-slate-300" : "text-slate-500 italic"}`}>
        {value || placeholder}
      </span>
      <Pencil size={11} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
    </button>
  );
}
