"use client";

import { useCallback, useEffect, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Code,
  GitBranch,
  Heading1,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  MousePointerClick,
  Redo,
  SquareDashed,
  Trash2,
  Undo,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmailBodyDoc } from "../types";
import {
  BUTTON_TONES,
  CALLOUT_TONES,
  Callout,
  Conditional,
  CtaButton,
  Variable,
  type ButtonTone,
} from "./email-editor-nodes";

/**
 * The email body, edited as content rather than as markup.
 *
 * What is stored is the document, not HTML — the server turns it into the
 * email, applying the fixed palette. So the admin chooses what a block is and
 * never what colour it is, which is what keeps every template on-brand and
 * rendering in Outlook.
 */
export function EmailVisualEditor({
  doc,
  onChange,
  onReady,
  variables,
  disabled,
}: {
  doc: EmailBodyDoc | null;
  onChange: (doc: EmailBodyDoc) => void;
  /**
   * The document as the editor actually holds it, once. Parsing fills in
   * defaults a stored document may not carry, so this is what "unchanged"
   * has to be measured against — comparing against the stored JSON reports
   * every template as edited the moment it opens.
   */
  onReady?: (doc: EmailBodyDoc) => void;
  /** Declared variables for this event, offered as insertable chips. */
  variables: string[];
  disabled?: boolean;
}) {
  // Held in a ref so the editor's onUpdate never closes over a stale callback;
  // re-creating the editor to refresh it would lose the cursor on every keypress.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const editor = useEditor({
    // Next renders this on the server first otherwise, and TipTap warns that
    // the two trees will not match.
    immediatelyRender: false,
    // v3 stops re-rendering on every transaction by default, which leaves the
    // toolbar and the block panels reading a stale selection — they would light
    // up only when something else happened to re-render the component.
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        // Email bodies have no horizontal rules, code blocks or blockquotes in
        // any existing template, and none of them survive the renderer.
        horizontalRule: false,
        codeBlock: false,
        blockquote: false,
      }),
      Link.configure({ openOnClick: false, autolink: false }),
      Callout,
      Conditional,
      CtaButton,
      Variable,
    ],
    content: doc ?? { type: "doc", content: [{ type: "paragraph" }] },
    editable: !disabled,
    onCreate: ({ editor }) => {
      onReadyRef.current?.(editor.getJSON() as EmailBodyDoc);
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getJSON() as EmailBodyDoc);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[340px] px-4 py-3 [&_h1]:text-2xl [&_h1]:font-extrabold [&_h2]:text-xl [&_h2]:font-extrabold",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(
      "Link URL — or a variable like {{actionUrl}}",
      previous ?? "",
    );
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  // Inserted with sensible defaults; the label, link and colour are then edited
  // in the panel below, which beats answering two prompts before you see it.
  const addButton = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setCtaButton({ url: "{{actionUrl}}", label: "Open", tone: "brand" })
      .run();
  }, [editor]);

  const addConditional = useCallback(() => {
    if (!editor) return;
    const variable = window.prompt(
      "Only show this when which variable has a value?",
      "actionUrl",
    );
    if (!variable?.trim()) return;
    editor.chain().focus().setConditional(variable.trim()).run();
  }, [editor]);

  const buttonAttrs = editor?.getAttributes("button") as
    | { url?: string; label?: string; tone?: ButtonTone }
    | undefined;
  const buttonSelected = Boolean(editor?.isActive("button"));

  if (!editor) {
    return (
      <div className="min-h-[400px] animate-pulse rounded-xl border border-border" />
    );
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-xl border border-border bg-background",
        disabled && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-1">
        <Tool
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          label="Bold"
        >
          <Bold className="size-4" />
        </Tool>
        <Tool
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          label="Italic"
        >
          <Italic className="size-4" />
        </Tool>
        <Tool
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          label="Monospace — for order ids and codes"
        >
          <Code className="size-4" />
        </Tool>

        <Divider />

        <Tool
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          active={editor.isActive("heading", { level: 1 })}
          label="Headline"
        >
          <Heading1 className="size-4" />
        </Tool>
        <Tool
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          label="Section heading"
        >
          <Heading2 className="size-4" />
        </Tool>

        <Divider />

        <Tool
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          label="Bullet list"
        >
          <List className="size-4" />
        </Tool>
        <Tool
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          label="Numbered list"
        >
          <ListOrdered className="size-4" />
        </Tool>

        <Divider />

        <Tool onClick={setLink} active={editor.isActive("link")} label="Link">
          <LinkIcon className="size-4" />
        </Tool>
        <Tool
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive("link")}
          label="Remove link"
        >
          <Unlink className="size-4" />
        </Tool>

        <Divider />

        <Tool
          onClick={() => editor.chain().focus().setCallout("neutral").run()}
          active={editor.isActive("callout")}
          label="Callout box"
        >
          <SquareDashed className="size-4" />
        </Tool>
        <Tool onClick={addButton} label="Call-to-action button">
          <MousePointerClick className="size-4" />
        </Tool>
        <Tool
          onClick={addConditional}
          active={editor.isActive("conditional")}
          label="Only show when a variable is set"
        >
          <GitBranch className="size-4" />
        </Tool>

        <div className="flex-1" />

        <Tool
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          label="Undo"
        >
          <Undo className="size-4" />
        </Tool>
        <Tool
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          label="Redo"
        >
          <Redo className="size-4" />
        </Tool>
      </div>

      {editor.isActive("callout") ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-3 py-2">
          <span className="text-xs text-muted-foreground">Callout tone</span>
          {CALLOUT_TONES.map((tone) => (
            <button
              key={tone.value}
              type="button"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .updateAttributes("callout", { tone: tone.value })
                  .run()
              }
              className={cn(
                "rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted",
                editor.isActive("callout", { tone: tone.value })
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {tone.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetCallout().run()}
            className="text-muted-foreground hover:text-foreground ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted"
          >
            <Trash2 className="size-3.5" />
            Remove box
          </button>
        </div>
      ) : null}

      {editor.isActive("conditional") ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-violet-50/60 px-3 py-2">
          <span className="text-xs text-violet-900">Only show when</span>
          <input
            value={
              (editor.getAttributes("conditional").variable as string) ?? ""
            }
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .updateAttributes("conditional", { variable: e.target.value })
                .run()
            }
            placeholder="actionUrl"
            className="w-44 rounded-md border border-violet-200 bg-white px-2 py-1 font-mono text-xs"
          />
          <button
            type="button"
            onClick={() =>
              editor
                .chain()
                .focus()
                .updateAttributes("conditional", {
                  negated: !editor.getAttributes("conditional").negated,
                })
                .run()
            }
            className="rounded-md bg-white px-2 py-1 text-xs text-violet-900 ring-1 ring-violet-200 transition-colors hover:bg-violet-100"
          >
            {editor.getAttributes("conditional").negated
              ? "is empty"
              : "has a value"}
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetConditional().run()}
            className="text-muted-foreground hover:text-foreground ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-white"
          >
            <Trash2 className="size-3.5" />
            Always show
          </button>
        </div>
      ) : null}

      {buttonSelected ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-3 py-2">
          <span className="text-xs text-muted-foreground">Button</span>
          <input
            value={buttonAttrs?.label ?? ""}
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .updateAttributes("button", { label: e.target.value })
                .run()
            }
            placeholder="Label"
            aria-label="Button label"
            className="border-input w-52 rounded-md border bg-background px-2 py-1 text-xs"
          />
          <input
            value={buttonAttrs?.url ?? ""}
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .updateAttributes("button", { url: e.target.value })
                .run()
            }
            placeholder="{{actionUrl}}"
            aria-label="Button link"
            className="border-input w-52 rounded-md border bg-background px-2 py-1 font-mono text-xs"
          />
          <span className="text-xs text-muted-foreground">Colour</span>
          {BUTTON_TONES.map((tone) => (
            <button
              key={tone.value}
              type="button"
              title={tone.label}
              aria-label={`${tone.label} button`}
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .updateAttributes("button", { tone: tone.value })
                  .run()
              }
              style={{ backgroundColor: tone.swatch }}
              className={cn(
                "size-5 rounded-full border-2 transition-transform",
                buttonAttrs?.tone === tone.value
                  ? "border-foreground scale-110"
                  : "border-transparent",
              )}
            />
          ))}
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteSelection().run()}
            className="text-muted-foreground hover:text-foreground ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted"
          >
            <Trash2 className="size-3.5" />
            Remove
          </button>
        </div>
      ) : null}

      {variables.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-3 py-2">
          <span className="text-xs text-muted-foreground">Insert</span>
          {variables.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => editor.chain().focus().insertVariable(name).run()}
              className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs text-primary transition-colors hover:bg-primary/20"
            >
              {`{{${name}}}`}
            </button>
          ))}
        </div>
      ) : null}

      <EditorContent editor={editor} />
    </div>
  );
}

function Divider() {
  return <div className="mx-1 h-4 w-px bg-border" />;
}

function Tool({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "rounded p-2 text-muted-foreground transition-colors hover:bg-muted/80",
        active && "bg-muted text-foreground",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {children}
    </button>
  );
}

export type { Editor };
