"use client";

import { useId } from "react";
import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";
import { usePurunStore } from "@/store/usePurunStore";
import { getDangerAdvice } from "@/lib/care-actions";

export default function DangerAlert({ compact = false }: { compact?: boolean }) {
  const assessment = usePurunStore((state) => state.currentAssessment);
  const advice = getDangerAdvice(assessment);
  const headingId = useId();

  return (
    <div aria-live="polite" aria-atomic="true">
      {advice && <section className={compact ? "danger-banner" : "danger-alert"} aria-labelledby={headingId}>
        <div className="danger-copy">
          <p className="danger-label"><Leaf size={16} aria-hidden="true" /> Action needed today</p>
          <h2 id={headingId}>{advice.headline}</h2>
          {!compact && <p className="danger-explanation">{advice.explanation}</p>}
        </div>
        <Link className="danger-action" href={advice.href} onClick={() => {
          const guide = document.getElementById(`care-${advice.actionId}`);
          if (guide instanceof HTMLDetailsElement) {
            guide.open = true;
            guide.querySelector("summary")?.focus({ preventScroll: true });
          }
        }}>{advice.actionLabel}<ArrowRight size={17} aria-hidden="true" /></Link>
      </section>}
    </div>
  );
}
