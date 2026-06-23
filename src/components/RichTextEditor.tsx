import React, { useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Link as LinkIcon, ImageIcon, Quote,
  Undo2, Redo2, Film as YoutubeIcon, SpellCheck, Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

function ToolbarButton({ active, onClick, title, children }: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${active
        ? "bg-[#09a1e5]/20 text-[#09a1e5]"
        : "text-slate-400 hover:text-white hover:bg-white/[0.06]"}`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange, placeholder, fullscreen, showAiFix }: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  fullscreen?: boolean;
  showAiFix?: boolean;
}) {
  const [fixingText, setFixingText] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false, // configured separately below
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[#09a1e5] underline" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full" },
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        HTMLAttributes: { class: "rounded-lg w-full aspect-video" },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: (fullscreen
          ? "max-w-none focus:outline-none h-full px-3 py-2 text-sm text-white "
          : "max-w-none focus:outline-none min-h-[150px] max-h-[420px] overflow-y-auto px-3 py-2 text-sm text-white ") +
          "[&_a]:text-[#09a1e5] [&_a]:underline [&_a]:cursor-pointer " +
          "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1.5 " +
          "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1.5 " +
          "[&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-2 [&_h3]:mb-1 " +
          "[&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 " +
          "[&_blockquote]:border-l-2 [&_blockquote]:border-slate-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-400 " +
          "[&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-2 [&_iframe]:rounded-lg [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:my-2 " +
          "[&_strong]:font-bold [&_em]:italic [&_s]:line-through",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync editor content when `value` changes externally (e.g. draft restore, edit-target switch)
  // and differs from the editor's current content (avoid clobbering while typing).
  React.useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    const currentNormalized = current === "<p></p>" ? "" : current;
    if (incoming !== currentNormalized) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;
    const ext = file.name.split(".").pop();
    const path = `task-artifacts/inline/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("task-media").upload(path, file, { contentType: file.type });
    if (error) return;
    const url = supabase.storage.from("task-media").getPublicUrl(path).data.publicUrl;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const onImagePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = "";
  }, [handleImageUpload]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL do link:", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL do YouTube:");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  const fixSpelling = useCallback(async () => {
    // AI fix-text not wired yet — stub for future Azure OpenAI integration
    if (!editor || fixingText) return;
    setFixingText(true);
    try {
      alert("AI spell-fix not available yet.");
    } finally {
      setFixingText(false);
    }
  }, [editor, fixingText, onChange]);

  if (!editor) return null;

  return (
    <div className={`w-full bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden focus-within:border-[#09a1e5] transition-colors ${fullscreen ? "h-full flex flex-col" : ""}`}>
      <div className={`flex items-center gap-0.5 px-1.5 py-1 border-b border-slate-800 flex-wrap ${fullscreen ? "shrink-0" : ""}`}>
        <ToolbarButton title="Negrito" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton title="Itálico" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton title="Tachado" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={14} />
        </ToolbarButton>
        <span className="w-px h-4 bg-slate-700 mx-0.5" />
        <ToolbarButton title="Título 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 size={14} />
        </ToolbarButton>
        <ToolbarButton title="Título 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={14} />
        </ToolbarButton>
        <ToolbarButton title="Título 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={14} />
        </ToolbarButton>
        <span className="w-px h-4 bg-slate-700 mx-0.5" />
        <ToolbarButton title="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </ToolbarButton>
        <ToolbarButton title="Citação" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={14} />
        </ToolbarButton>
        <span className="w-px h-4 bg-slate-700 mx-0.5" />
        <ToolbarButton title="Link" active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon size={14} />
        </ToolbarButton>
        <label title="Inserir imagem" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
          <ImageIcon size={14} />
          <input type="file" accept="image/*" className="hidden" onChange={onImagePick} />
        </label>
        <ToolbarButton title="Vídeo do YouTube" onClick={addYoutube}>
          <YoutubeIcon size={14} />
        </ToolbarButton>
        <span className="w-px h-4 bg-slate-700 mx-0.5" />
        <ToolbarButton title="Desfazer" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={14} />
        </ToolbarButton>
        <ToolbarButton title="Refazer" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={14} />
        </ToolbarButton>
        {showAiFix && (
          <>
            <span className="w-px h-4 bg-slate-700 mx-0.5" />
            <ToolbarButton title="Corrigir ortografia (IA)" onClick={fixSpelling}>
              {fixingText ? <Loader2 size={14} className="animate-spin" /> : <SpellCheck size={14} />}
            </ToolbarButton>
          </>
        )}
      </div>
      <EditorContent editor={editor} placeholder={placeholder} className={fullscreen ? "flex-1 min-h-0 overflow-y-auto" : ""} />
    </div>
  );
}
