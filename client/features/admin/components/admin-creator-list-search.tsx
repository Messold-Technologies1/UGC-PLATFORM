"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/hooks/use-debounce";

interface AdminCreatorListSearchProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
}

export function AdminCreatorListSearch({
  value = "",
  onChange,
  placeholder = "Search by name…",
  className,
  isLoading = false,
}: AdminCreatorListSearchProps) {
  const [input, setInput] = useState(() => value ?? "");
  const debouncedChange = useDebouncedCallback(onChange, 400);

  useEffect(() => {
    setInput(value ?? "");
  }, [value]);

  function handleChange(next: string) {
    setInput(next);
    debouncedChange(next);
  }

  const showClear = Boolean(input);

  return (
    <div className={className ?? "relative w-full max-w-md"}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        value={input ?? ""}
        placeholder={placeholder}
        className="h-10 rounded-xl border-border/60 bg-background/80 pl-9 pr-10"
        onChange={(e) => handleChange(e.target.value)}
        aria-busy={isLoading}
      />
      {showClear ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => handleChange("")}
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
