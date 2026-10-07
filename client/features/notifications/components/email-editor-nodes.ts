import { Node, mergeAttributes, type ChainedCommands } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";

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

/** Button colours, matching the fixed set the server will render. */
export const BUTTON_TONES = [
  { value: "brand", label: "Brand", swatch: "#ff5da2" },
  { value: "ink", label: "Ink", swatch: "#181313" },
  { value: "success", label: "Green", swatch: "#16a34a" },
  { value: "info", label: "Blue", swatch: "#2563eb" },
  { value: "danger", label: "Red", swatch: "#dc2626" },
] as const;

export type ButtonTone = (typeof BUTTON_TONES)[number]["value"];

const BUTTON_SWATCH: Record<ButtonTone, string> = {
  brand: "#ff5da2",
  ink: "#181313",
  success: "#16a34a",
  info: "#2563eb",
  danger: "#dc2626",
};

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
      unsetCallout: () => ReturnType;
      setCtaButton: (attrs: {
        url: string;
        label: string;
        tone?: ButtonTone;
      }) => ReturnType;
      insertVariable: (name: string) => ReturnType;
      setConditional: (variable: string, negated?: boolean) => ReturnType;
      unsetConditional: () => ReturnType;
    };
  }
}

/**
 * Replaces the wrapper around the cursor with its own children.
 *
 * `lift` refuses on these nodes because they are `defining`, which is the same
 * flag that stops a paste from dissolving them — so the unwrap is done as an
 * explicit replace instead. The content survives; only the box goes.
 */
function unwrapCommand(name: string) {
  return () =>
    ({
      state,
      chain,
    }: {
      state: EditorState;
      chain: () => ChainedCommands;
    }) => {
      const { $from } = state.selection;
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const node = $from.node(depth);
        if (node.type.name !== name) continue;
        const from = $from.before(depth);
        const to = $from.after(depth);
        return chain()
          .command(({ tr }) => {
            tr.replaceWith(from, to, node.content);
            return true;
          })
          .run();
      }
      return false;
    };
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
      // Keeps the paragraphs as ordinary copy rather than deleting them —
      // removing a box should not cost you the words inside it.
      unsetCallout: unwrapCommand(this.name),
    };
  },
});

/**
 * A block that only sends when a variable has a value.
 *
 * This is what lets a template offer an action link only when there is one to
 * offer, instead of rendering a button that goes nowhere. `negated` is the
 * other half of an if/else: the two arms are separate blocks, each editable
 * and removable on its own.
 */
export const Conditional = Node.create({
  name: "conditional",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variable: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-variable") ?? "",
        renderHTML: (attrs) => ({ "data-variable": attrs.variable as string }),
      },
      negated: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-negated") === "true",
        renderHTML: (attrs) => ({ "data-negated": String(attrs.negated) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="conditional"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "conditional",
        class:
          "my-3 rounded-lg border border-dashed border-violet-400 bg-violet-50/40 px-3 py-2",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setConditional:
        (variable, negated = false) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variable, negated }),
      unsetConditional: unwrapCommand(this.name),
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
      tone: { default: "brand" as ButtonTone },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="cta-button"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const tone = (node.attrs.tone as ButtonTone) ?? "brand";
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
            "inline-block rounded-full border-2 border-neutral-900 px-6 py-2.5 text-sm font-bold text-white",
          style: `background-color:${BUTTON_SWATCH[tone] ?? BUTTON_SWATCH.brand}`,
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
