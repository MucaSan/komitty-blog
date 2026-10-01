"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
} from "react";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import Suggestion from "@tiptap/suggestion";
import { editorExtensions } from "@/lib/editorExtensions";

type Range = { from: number; to: number };
type SlashProps = { editor: any; range: Range };

type SlashItem = {
  title: string;
  icon: string;
  command: (props: SlashProps) => void;
};

const slashItems: SlashItem[] = [
  { title: "Text", icon: "T", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run() },
  { title: "Heading 1", icon: "H1", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run() },
  { title: "Heading 2", icon: "H2", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run() },
  { title: "Heading 3", icon: "H3", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run() },
  { title: "Bullet list", icon: "•", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { title: "Numbered list", icon: "1.", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
  { title: "Quote", icon: "❝", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
  { title: "Code block", icon: "</>", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
  { title: "Divider", icon: "—", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
];

const SlashCommand = Extension.create({
  name: "slash-command",
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        command: ({ editor, range, props }) => {
          (props as SlashItem).command({ editor, range });
        },
        items: ({ query }) =>
          slashItems
            .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10),
        render: () => {
          let component: ReactRenderer | null = null;
          let el: HTMLElement | null = null;

          return {
            onStart: (props) => {
              el = document.createElement("div");
              document.body.appendChild(el);
              component = new ReactRenderer(SlashMenu, {
                props,
                editor: props.editor,
              });
              el.appendChild(component.element);
              positionMenu(props, el);
            },
            onUpdate: (props) => {
              component?.updateProps(props);
              if (el) positionMenu(props, el);
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                return true;
              }
              return (component?.ref as any)?.onKeyDown?.(props) ?? false;
            },
            onExit: () => {
              component?.destroy();
              el?.remove();
            },
          };
        },
      }),
    ];
  },
});

function positionMenu(props: any, el: HTMLElement) {
  const rect = props.clientRect?.();
  if (!rect) return;
  el.style.position = "fixed";
  el.style.zIndex = "60";
  const left = Math.min(rect.left, window.innerWidth - 240);
  const top = Math.min(rect.bottom + 8, window.innerHeight - 260);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

const SlashMenu = forwardRef(function SlashMenu(
  props: { items: SlashItem[]; command: (item: SlashItem) => void },
  ref,
) {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [props.items]);

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          setSelected((s) => (s + props.items.length - 1) % props.items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelected((s) => (s + 1) % props.items.length);
          return true;
        }
        if (event.key === "Enter") {
          const item = props.items[selected];
          if (item) props.command(item);
          return true;
        }
        return false;
      },
    }),
    [props.items, selected],
  );

  return (
    <div className="slash-menu">
      {props.items.length === 0 ? (
        <div className="slash-menu__empty">No results</div>
      ) : (
        props.items.map((item, i) => (
          <button
            key={item.title}
            type="button"
            className={`slash-menu__item ${i === selected ? "slash-menu__item--active" : ""}`}
            onClick={() => props.command(item)}
            onMouseEnter={() => setSelected(i)}
          >
            <span className="slash-menu__icon">{item.icon}</span>
            <span className="slash-menu__label">{item.title}</span>
          </button>
        ))
      )}
    </div>
  );
});

const COLORS = [
  { label: "Default", value: "" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
  { label: "Purple", value: "#a855f7" },
];

function ToolbarButton({
  active,
  onClick,
  label,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  label: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className={`toolbar-btn ${active ? "toolbar-btn--active" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function RichTextEditor({
  onChange,
  placeholder,
  onUploadImage,
}: {
  onChange?: (json: string, isEmpty: boolean) => void;
  placeholder?: string;
  onUploadImage?: (file: File) => Promise<string>;
}) {
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      ...editorExtensions,
      Placeholder.configure({
        placeholder: placeholder ?? "Write about your achievement…",
      }),
      SlashCommand,
    ],
    content: "",
    editorProps: {
      attributes: { class: "richtext__content" },
    },
    onUpdate: ({ editor }) => {
      onChange?.(JSON.stringify(editor.getJSON()), editor.isEmpty);
    },
  });

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const handler = () => setTick((t) => t + 1);
    editor.on("transaction", handler);
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("transaction", handler);
      editor.off("selectionUpdate", handler);
    };
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor || !onUploadImage) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/gif,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await onUploadImage(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Image upload failed");
      }
    };
    input.click();
  }, [editor, onUploadImage]);

  if (!editor) return null;

  const setColor = (color: string) => {
    if (color === "") {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
    setColorMenuOpen(false);
  };

  return (
    <div className="richtext">
      <div className="toolbar">
        <div className="toolbar__group">
          <ToolbarButton label="H1" title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
          <ToolbarButton label="H2" title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <ToolbarButton label="H3" title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        </div>

        <div className="toolbar__group">
          <ToolbarButton label={<b>B</b>} title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
          <ToolbarButton label={<i>I</i>} title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <ToolbarButton label={<u>U</u>} title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <ToolbarButton label={<s>S</s>} title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
          <ToolbarButton label="code" title="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} />
          <ToolbarButton label="🔗" title="Link" active={editor.isActive("link")} onClick={setLink} />
          <ToolbarButton label="🖍" title="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} />
          <div className="toolbar__color">
            <ToolbarButton label={<span className="color-swatch">A</span>} title="Text color" onClick={() => setColorMenuOpen((o) => !o)} />
            {colorMenuOpen && (
              <div className="color-menu">
                {COLORS.map((c) => (
                  <button key={c.label} type="button" className="color-menu__item" title={c.label} onClick={() => setColor(c.value)}>
                    <span className="color-menu__dot" style={{ background: c.value || "var(--text)" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="toolbar__group">
          <ToolbarButton label="• List" title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <ToolbarButton label="1. List" title="Ordered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <ToolbarButton label="❝" title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <ToolbarButton label="</>" title="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
          <ToolbarButton label="—" title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
          <ToolbarButton label="🖼" title="Image" onClick={addImage} />
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
