"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface TocItem {
  id: string;
  label: string;
}

interface TableOfContentsProps {
  items: TocItem[];
  isModal?: boolean;
}

export function TableOfContents({ items, isModal = false }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [activeId]);

  useEffect(() => {
    const headings = items
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (headings.length === 0) return;

    const root = isModal 
      ? document.getElementById("version-preview-scroll-container") 
      : null;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        root,
        rootMargin: isModal ? "0px 0px -60% 0px" : "-80px 0px -60% 0px",
        threshold: 0.1,
      },
    );

    headings.forEach((heading) => observerRef.current?.observe(heading));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [items]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (el) {
        if (isModal) {
          const container = document.getElementById("version-preview-scroll-container");
          if (container) {
            const containerRect = container.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            container.scrollTop = container.scrollTop + (elRect.top - containerRect.top) - 24;
          }
        } else {
          const top = el.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top, behavior: "smooth" });
        }
        setActiveId(id);
        if (!isModal) {
          window.history.replaceState(null, "", `#${id}`);
        }
      }
    },
    [],
  );

  return (
    <nav
      aria-label="Table of contents"
      className="hidden lg:block"
    >
      <div className="sticky top-24">
        <div className="rounded-xl border border-border bg-card/50 p-5 backdrop-blur-sm">
          <div className="mb-3 text-sm font-semibold text-foreground">
            Content
          </div>
          <ul className={`space-y-0.5 overflow-y-auto overscroll-contain pr-1 scrollbar-thin ${isModal ? 'max-h-[50vh]' : 'max-h-[calc(100vh-220px)]'}`}>
            {items.map(({ id, label }, index) => (
              <li key={id}>
                <a
                  ref={activeId === id ? activeItemRef : undefined}
                  href={`#${id}`}
                  onClick={(e) => handleClick(e, id)}
                  className={`block rounded-md px-3 py-1.5 text-[13px] leading-snug transition-all duration-200 ${
                    activeId === id
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {index + 1}.&ensp;{label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
