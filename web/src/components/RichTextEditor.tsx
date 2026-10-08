import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, type ReactNode } from 'react';
import { plainToHtml } from './RichText';

function ToolButton({ onClick, active, label, children }: { onClick: () => void; active?: boolean; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`min-w-8 rounded px-2 py-1 text-sm ${active ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-200'}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      h2: e.isActive('heading', { level: 2 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  return (
    <div className="flex flex-wrap gap-0.5 border-b border-slate-200 bg-slate-50 p-1">
      <ToolButton label="In đậm (Ctrl+B)" active={s.bold} onClick={() => c().toggleBold().run()}><b>B</b></ToolButton>
      <ToolButton label="In nghiêng (Ctrl+I)" active={s.italic} onClick={() => c().toggleItalic().run()}><i>I</i></ToolButton>
      <ToolButton label="Gạch chân (Ctrl+U)" active={s.underline} onClick={() => c().toggleUnderline().run()}><u>U</u></ToolButton>
      <span className="mx-1 w-px bg-slate-200" />
      <ToolButton label="Tiêu đề" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>H</ToolButton>
      <ToolButton label="Danh sách chấm" active={s.bullet} onClick={() => c().toggleBulletList().run()}>• —</ToolButton>
      <ToolButton label="Danh sách số" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>1.</ToolButton>
      <ToolButton label="Trích dẫn" active={s.quote} onClick={() => c().toggleBlockquote().run()}>❝</ToolButton>
      <span className="mx-1 w-px bg-slate-200" />
      <ToolButton label="Hoàn tác (Ctrl+Z)" onClick={() => s.canUndo && c().undo().run()}>↶</ToolButton>
      <ToolButton label="Làm lại (Ctrl+Y)" onClick={() => s.canRedo && c().redo().run()}>↷</ToolButton>
    </div>
  );
}

/** Trình soạn thảo có định dạng (TipTap). Giá trị là HTML. */
export default function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  invalid,
  minHeight = 160,
  id,
}: {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  minHeight?: number;
  id?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } })],
    content: plainToHtml(value),
    editorProps: {
      attributes: {
        ...(id && { id }),
        class: 'rich-text px-3 py-2 outline-none',
        style: `min-height:${minHeight}px`,
        'aria-multiline': 'true',
        role: 'textbox',
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
    onBlur: () => onBlur?.(),
  });

  // Đồng bộ khi giá trị bị đặt lại từ ngoài (reset form)
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (value !== current && !editor.isFocused) editor.commands.setContent(plainToHtml(value), { emitUpdate: false });
  }, [value, editor]);

  return (
    <div className={`overflow-hidden rounded-lg border bg-white focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20 ${invalid ? 'border-red-400' : 'border-slate-300'}`}>
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
      {placeholder && <p className="border-t border-slate-100 px-3 py-1 text-xs text-slate-400">{placeholder}</p>}
    </div>
  );
}
