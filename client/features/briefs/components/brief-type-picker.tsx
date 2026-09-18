"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { BRIEF_TYPE_COPY } from "@/features/briefs/lib/brief-offer-labels";
import { cn } from "@/lib/utils";
import styles from "./brief-studio.module.css";

type BriefType = "product" | "service";

type BriefTypePickerProps = {
  value: BriefType;
  onChange: (nextIsProduct: boolean) => void;
};

export function BriefTypePicker({ value, onChange }: BriefTypePickerProps) {
  const selected = BRIEF_TYPE_COPY[value];

  return (
    <div className={styles.briefTypeSwitch}>
      <p className={styles.briefTypeQuestion}>
        What would you like the creator to promote?
      </p>

      <div className={styles.briefTypeCards} role="radiogroup">
        <button
          type="button"
          role="radio"
          aria-checked={value === "product"}
          className={cn(
            styles.briefTypeCard,
            value === "product" && styles.briefTypeCardSelected,
          )}
          onClick={() => onChange(true)}
        >
          {value === "product" ? (
            <span className={styles.briefTypeCardCheck} aria-hidden="true">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          ) : null}
          <Image
            src="/assets/brief-type-product.png"
            alt=""
            width={88}
            height={88}
            className={styles.briefTypeCardArt}
          />
          <span className={styles.briefTypeCardCopy}>
            <span className={styles.briefTypeCardTitle}>
              {BRIEF_TYPE_COPY.product.tab}
            </span>
            <span className={styles.briefTypeCardBlurb}>
              {BRIEF_TYPE_COPY.product.cardBlurb}
            </span>
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={value === "service"}
          className={cn(
            styles.briefTypeCard,
            value === "service" && styles.briefTypeCardSelected,
          )}
          onClick={() => onChange(false)}
        >
          {value === "service" ? (
            <span className={styles.briefTypeCardCheck} aria-hidden="true">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          ) : null}
          <Image
            src="/assets/brief-type-service.png"
            alt=""
            width={88}
            height={88}
            className={styles.briefTypeCardArt}
          />
          <span className={styles.briefTypeCardCopy}>
            <span className={styles.briefTypeCardTitle}>
              {BRIEF_TYPE_COPY.service.tab}
            </span>
            <span className={styles.briefTypeCardBlurb}>
              {BRIEF_TYPE_COPY.service.cardBlurb}
            </span>
          </span>
        </button>
      </div>

      <div className={styles.briefTypePanel}>
        <p className={styles.briefTypeCopyTitle}>{selected.title}</p>
        <p>{selected.description}</p>
      </div>
    </div>
  );
}
