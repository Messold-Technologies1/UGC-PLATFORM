"use client";

import { useCallback, useEffect, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  MousePointerClick,
  Redo,
  SquareDashed,
  Undo,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmailBodyDoc } from "../types";
import {
  CALLOUT_TONES,
  Callout,
  CtaButton,
  Variable,
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
  variables,
  disabled,
}: {
  doc: EmailBodyDoc | null;
  onChange: (doc: EmailBodyDoc) => void;
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

  const editor = useEditor({
    // Next renders this on the server first otherwise, and TipTap warns that
    // the two trees will not match.
    immediatelyRender: false,
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
      CtaButton,
      Variable,
    ],
    content: doc ?? { type: "doc", content: [{ type: "paragraph" }] },
    editable: !disabled,
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

  const addButton = useCallback(() => {
    if (!editor) return;
    const url = window.prompt(
      "Button link — usually {{actionUrl}}",
      "{{actionUrl}}",
    );
    if (!url) return;
    const label = window.prompt("Button label", "Open") ?? "Open";
    editor.chain().focus().setCtaButton({ url, label }).run();
  }, [editor]);

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
