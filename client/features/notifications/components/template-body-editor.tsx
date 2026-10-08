"use client";

import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Whether the plain-text part is following the HTML or has been taken over.
 *
 * HTML is the source of truth: the plain-text part regenerates from it as you
 * type, so the two cannot silently drift. Typing in the text box is treated as
 * taking it over — auto-overwriting someone's wording mid-sentence would be
 * hostile — and "Regenerate" hands it back.
 */
export type TextMode = "auto" | "manual";

export function TemplateBodyEditor({
  subject,
  onSubjectChange,
  html,
  onHtmlChange,
  text,
  onTextChange,
  textMode,
  onRegenerateText,
  derivedText,
  htmlRequired = false,
}: {
  subject: string;
  onSubjectChange: (value: string) => void;
  html: string;
  onHtmlChange: (value: string) => void;
  text: string;
  onTextChange: (value: string) => void;
  textMode: TextMode;
  onRegenerateText: () => void;
  derivedText: string | null;
  htmlRequired?: boolean;
}) {
  const htmlMissing = htmlRequired && html.trim().length === 0;
  // Only meaningful once a derivation has come back; before that "differs" would
  // just mean "not loaded yet".
  const outOfSync =
    textMode === "manual" &&
    derivedText !== null &&
    text.trim() !== derivedText.trim();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="tpl-subject">
          Subject
        </label>
        <Input
          id="tpl-subject"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="font-mono text-sm"
          placeholder="Welcome to {{platformName}}"
        />
      </div>

      <Tabs defaultValue="html">
        <TabsList>
          <TabsTrigger value="html">
            HTML
            {htmlRequired && <span className="ml-1 text-red-600">*</span>}
          </TabsTrigger>
          <TabsTrigger value="text">Plain text</TabsTrigger>
        </TabsList>

        <TabsContent value="html" className="space-y-2">
          <Textarea
            value={html}
            onChange={(e) => onHtmlChange(e.target.value)}
            rows={26}
            className="font-mono text-xs"
            aria-invalid={htmlMissing}
            placeholder="<p>Hi {{recipientName}},</p>"
          />
          {htmlMissing ? (
            <p className="text-xs text-red-600">
              HTML is required. Paste the body and the plain-text part is
              generated from it.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              The body only — the shared shell adds the header, footer and
              branding.
            </p>
          )}
        </TabsContent>

        <TabsContent value="text" className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant={textMode === "auto" ? "secondary" : "outline"}>
              {textMode === "auto" ? "Generated from HTML" : "Edited by hand"}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRegenerateText}
              disabled={derivedText === null || textMode === "auto"}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Regenerate from HTML
            </Button>
          </div>

          <Textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={24}
            className="font-mono text-xs"
            placeholder="Generated from the HTML as you type."
          />

          {outOfSync ? (
            <p className="text-xs text-amber-700">
              This no longer matches the HTML. Regenerate to replace it, or leave
              it — your wording is what will be sent.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              {textMode === "auto"
                ? "Follows the HTML as you edit it. Type here to take it over."
                : "Your wording is sent as the plain-text part."}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
