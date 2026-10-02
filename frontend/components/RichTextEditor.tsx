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
import { useTranslation } from "@/components/LanguageProvider";

type Range = { from: number; to: number };
type SlashProps = { editor: any; range: Range };

type SlashItem = {
  title: string;
  icon: string;
  command: (props: SlashProps) => void;
};

type SlashItemDef = Omit<SlashItem, "title"> & { titleKey: string };

// Module-level translator for the slash menu, which is rendered outside the
// React context tree via ReactRenderer.
let currentT: (key: string) => string = (key) => key;

const slashItems: SlashItemDef[] = [
  { titleKey: "editor.text", icon: "T", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run() },
  { titleKey: "editor.heading1", icon: "H1", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run() },
  { titleKey: "editor.heading2", icon: "H2", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run() },
  { titleKey: "editor.heading3", icon: "H3", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run() },
  { titleKey: "editor.bulletList", icon: "•", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { titleKey: "editor.orderedList", icon: "1.", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
  { titleKey: "editor.quote", icon: "❝", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
  { titleKey: "editor.codeBlock", icon: "</>", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
  { titleKey: "editor.divider", icon: "—", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
  { titleKey: "editor.table", icon: "▦", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
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
        items: ({ query }) => {
          const q = query.toLowerCase();
          return slashItems
            .filter((item) => currentT(item.titleKey).toLowerCase().includes(q))
            .slice(0, 10)
            .map((item): SlashItem => ({
              title: currentT(item.titleKey),
              icon: item.icon,
              command: item.command,
            }));
        },
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
        <div className="slash-menu__empty">{currentT("editor.noResults")}</div>
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

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  bold: "M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8",
  italic: "M19 4h-9M14 20H5M15 4L9 20",
  underline: "M6 4v6a6 6 0 0 0 12 0V4M4 20h16",
  strike: "M16 4H9a3 3 0 0 0-2.83 4M14 12a4 4 0 0 1 0 8H6M4 12h16",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  image: "M3 3h18v18H3zM8.5 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM21 15l-5-5L5 21",
  highlight: "M9 11l-6 6v3h9l3-3M12 4l8 8",
  bulletList: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  orderedList: "M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1",
  quote: "M10 11H6.2a2 2 0 0 0-2 1.8A4 4 0 0 0 8 19a2 2 0 0 0 2-2v-6zm8 0h-3.8a2 2 0 0 0-2 1.8A4 4 0 0 0 16 19a2 2 0 0 0 2-2v-6z",
  codeBlock: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M10 12l-2 2 2 2M14 12l2 2-2 2",
  divider: "M5 12h14",
  alignLeft: "M17 10H3M21 6H3M21 14H3M17 18H3",
  alignCenter: "M18 10H6M21 6H3M21 14H3M18 18H6",
  alignRight: "M21 10H7M21 6H3M21 14H3M21 18H7",
  alignJustify: "M21 10H3M21 6H3M21 14H3M21 18H3",
  table: "M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18",
};

function parseInitialContent(content?: string): string | object {
  if (!content) return "";
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("{")) return "";
  try {
    return JSON.parse(content);
  } catch {
    return "";
  }
}

function ToolbarButton({
  active,
  onClick,
  icon,
  label,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  icon?: string;
  label?: ReactNode;
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
      {icon ? <Icon d={icon} /> : label}
    </button>
  );
}

export function RichTextEditor({
  onChange,
  placeholder,
  onUploadImage,
  initialContent,
}: {
  onChange?: (json: string, isEmpty: boolean) => void;
  placeholder?: string;
  onUploadImage?: (file: File) => Promise<string>;
  initialContent?: string;
}) {
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const { t } = useTranslation();
  currentT = t;

  const editor = useEditor({
    extensions: [
      ...editorExtensions,
      Placeholder.configure({
        placeholder: placeholder ?? "Write about your achievement…",
      }),
      SlashCommand,
    ],
    content: parseInitialContent(initialContent),
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
    const url = window.prompt(t("editor.linkPrompt"), previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const uploadAndInsert = useCallback(
    (file: File, pos?: number) => {
      if (!editor || !onUploadImage) return;
      onUploadImage(file)
        .then((url) => {
          const insertAt = pos ?? editor.state.selection.from;
          editor
            .chain()
            .focus()
            .insertContentAt(insertAt, { type: "image", attrs: { src: url } })
            .run();
        })
        .catch((err) => {
          window.alert(err instanceof Error ? err.message : t("editor.uploadFailed"));
        });
    },
    [editor, onUploadImage],
  );

  const addImage = useCallback(() => {
    if (!editor || !onUploadImage) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/gif,image/webp";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) uploadAndInsert(file);
    };
    input.click();
  }, [editor, onUploadImage, uploadAndInsert]);

  // Drag-and-drop image upload.
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom;
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        el.classList.add("richtext__content--dragging");
      }
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) {
        el.classList.remove("richtext__content--dragging");
      }
    };
    const onDrop = (e: DragEvent) => {
      el.classList.remove("richtext__content--dragging");
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.startsWith("image/")) return;
      e.preventDefault();
      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })?.pos;
      uploadAndInsert(file, pos);
    };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, [editor, uploadAndInsert]);

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
          <ToolbarButton label="H1" title={t("editor.heading1")} active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
          <ToolbarButton label="H2" title={t("editor.heading2")} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <ToolbarButton label="H3" title={t("editor.heading3")} active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        </div>

        <div className="toolbar__group">
          <ToolbarButton icon={ICONS.alignLeft} title={t("editor.alignLeft")} active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} />
          <ToolbarButton icon={ICONS.alignCenter} title={t("editor.alignCenter")} active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} />
          <ToolbarButton icon={ICONS.alignRight} title={t("editor.alignRight")} active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} />
          <ToolbarButton icon={ICONS.alignJustify} title={t("editor.alignJustify")} active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} />
        </div>

        <div className="toolbar__group">
          <ToolbarButton icon={ICONS.bold} title={t("editor.bold")} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
          <ToolbarButton icon={ICONS.italic} title={t("editor.italic")} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <ToolbarButton icon={ICONS.underline} title={t("editor.underline")} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <ToolbarButton icon={ICONS.strike} title={t("editor.strikethrough")} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
          <ToolbarButton icon={ICONS.code} title={t("editor.inlineCode")} active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} />
          <ToolbarButton icon={ICONS.link} title={t("editor.link")} active={editor.isActive("link")} onClick={setLink} />
          <ToolbarButton icon={ICONS.highlight} title={t("editor.highlight")} active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} />
          <div className="toolbar__color">
            <ToolbarButton label={<span className="color-swatch">A</span>} title={t("editor.textColor")} onClick={() => setColorMenuOpen((o) => !o)} />
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
          <ToolbarButton icon={ICONS.bulletList} title={t("editor.bulletList")} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <ToolbarButton icon={ICONS.orderedList} title={t("editor.orderedList")} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <ToolbarButton icon={ICONS.quote} title={t("editor.quote")} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <ToolbarButton icon={ICONS.codeBlock} title={t("editor.codeBlock")} active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
          <ToolbarButton icon={ICONS.divider} title={t("editor.divider")} onClick={() => editor.chain().focus().setHorizontalRule().run()} />
          <ToolbarButton icon={ICONS.table} title={t("editor.table")} active={editor.isActive("table")} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
          <ToolbarButton icon={ICONS.image} title={t("editor.image")} onClick={addImage} />
        </div>

        {editor.isActive("table") && (
          <div className="toolbar__group">
            <ToolbarButton label="+Row" title={t("editor.addRowAfter")} onClick={() => editor.chain().focus().addRowAfter().run()} />
            <ToolbarButton label="+Col" title={t("editor.addColumnAfter")} onClick={() => editor.chain().focus().addColumnAfter().run()} />
            <ToolbarButton label="−Row" title={t("editor.deleteRow")} onClick={() => editor.chain().focus().deleteRow().run()} />
            <ToolbarButton label="−Col" title={t("editor.deleteColumn")} onClick={() => editor.chain().focus().deleteColumn().run()} />
            <ToolbarButton label="✕" title={t("editor.deleteTable")} onClick={() => editor.chain().focus().deleteTable().run()} />
          </div>
        )}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
