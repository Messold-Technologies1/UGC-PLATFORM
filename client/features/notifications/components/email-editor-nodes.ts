import { Node, mergeAttributes } from "@tiptap/core";

/**
 * The blocks an email body is made of, beyond prose.
 *
 * Each one stores intent, not styling — a callout records that it is a callout
 * and which tone, never a colour — because the server decides what every block
 * looks like when it renders the email. That is what keeps thirty-odd templates
 * consistent and lets the palette change in one place.
 *
 * The classes below are for the editor canvas only; they approximate the email
 * so editing feels like the result, while the preview pane shows the real
 * thing rendered by the server.
 */

export const CALLOUT_TONES = [
  { value: "neutral", label: "Neutral" },
  { value: "brand", label: "Brand" },
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "caution", label: "Caution" },
] as const;

export type CalloutTone = (typeof CALLOUT_TONES)[number]["value"];

const TONE_CANVAS_CLASS: Record<CalloutTone, string> = {
  neutral: "bg-neutral-50",
  brand: "bg-pink-50",
  info: "bg-blue-50",
  success: "bg-green-50",
  warning: "bg-amber-50",
  caution: "bg-orange-50",
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    emailBlocks: {
      setCallout: (tone?: CalloutTone) => ReturnType;
      setCtaButton: (attrs: { url: string; label: string }) => ReturnType;
      insertVariable: (name: string) => ReturnType;
    };
  }
}

/** A bordered aside. Holds paragraphs; the first is rendered as its label. */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "paragraph+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: "neutral" as CalloutTone,
        parseHTML: (el) => el.getAttribute("data-tone") ?? "neutral",
        renderHTML: (attrs) => ({ "data-tone": attrs.tone as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const tone = (node.attrs.tone as CalloutTone) ?? "neutral";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        class: `rounded-xl border-2 border-neutral-900 px-4 py-3 my-3 ${
          TONE_CANVAS_CLASS[tone] ?? TONE_CANVAS_CLASS.neutral
        }`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (tone = "neutral") =>
        ({ commands }) =>
          commands.wrapIn(this.name, { tone }),
    };
  },
});

/**
 * The call to action. A leaf node with its text in an attribute rather than an
 * editable child, so the label cannot pick up bold, a link or a second
 * paragraph — none of which survive the bulletproof table the server emits.
 */
export const CtaButton = Node.create({
  name: "button",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      url: { default: "" },
      label: { default: "Open" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="cta-button"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "cta-button",
        class: "my-3",
      }),
      [
        "span",
        {
          class:
            "inline-block rounded-full border-2 border-neutral-900 bg-[#ff5da2] px-6 py-2.5 text-sm font-bold text-white",
        },
        (node.attrs.label as string) || "Open",
      ],
    ];
  },

  addCommands() {
    return {
      setCtaButton:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

/**
 * A `{{variable}}` as one indivisible chip.
 *
 * Typed braces are editable character by character, so half a backspace leaves
 * `{{recipientNam` — which renders as nothing and is invisible until someone
 * receives the email. As a node it is inserted and deleted whole.
 */
export const Variable = Node.create({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return { name: { default: "" } };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="variable"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "variable",
        class:
          "rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.85em] text-primary",
      }),
      `{{${(node.attrs.name as string) || "?"}}}`,
    ];
  },

  addCommands() {
    return {
      insertVariable:
        (name) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { name } }),
    };
  },
});
