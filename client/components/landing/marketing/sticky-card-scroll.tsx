"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Pins the profile card and slides the text block downward as the user
 * scrolls, so copy travels toward the bottom of the card instead of off
 * the top of the screen.
 */
export function StickyCardScroll({
  card,
  children,
  className,
}: {
  card: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(0);
  const [travel, setTravel] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      if (!window.matchMedia("(min-width: 1024px)").matches) {
        setCardH(0);
        setTravel(0);
        return;
      }
      const nextCardH = cardRef.current?.offsetHeight ?? 0;
      const textH = textRef.current?.offsetHeight ?? 0;
      setCardH(nextCardH);
      setTravel(Math.max(0, nextCardH - textH));
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (cardRef.current) ro.observe(cardRef.current);
    if (textRef.current) ro.observe(textRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const pinRatio = cardH + travel > 0 ? travel / (cardH + travel) : 1;
  const y = useTransform(scrollYProgress, [0, pinRatio, 1], [0, travel, travel]);

  const canPin = !reduceMotion && travel > 0;

  return (
    <div
      ref={sectionRef}
      className="relative"
      style={canPin ? { height: cardH + travel } : undefined}
    >
      <div
        className={cn(
          "grid items-start",
          canPin && "lg:sticky lg:top-24",
          className,
        )}
      >
        <div ref={cardRef}>{card}</div>
        <motion.div
          ref={textRef}
          style={canPin ? { y } : undefined}
          className="will-change-transform"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
