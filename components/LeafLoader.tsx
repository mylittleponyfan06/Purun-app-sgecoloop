type LeafLoaderProps = {
  label: string;
  detail?: string;
  compact?: boolean;
  announce?: boolean;
};

/** Inline SVG and CSS: the loading illustration never needs a network request. */
export default function LeafLoader({ label, detail, compact = false, announce = true }: LeafLoaderProps) {
  return <span className={`leaf-loader${compact ? " leaf-loader-compact" : ""}`} role={announce ? "status" : undefined} aria-atomic={announce ? true : undefined}>
    <span className="leaf-loader-scene" aria-hidden="true">
      {[0, 1, 2].map((leaf) => <svg key={leaf} className="leaf-loader-leaf" viewBox="0 0 28 36" focusable="false">
        <path d="M23 3C9 2 1 10 4 21c2 8 11 10 16 3 4-6 4-13 3-21Z" fill="currentColor" />
        <path d="M21 7C15 15 11 23 7 33m7-14-5-4m8-1 4-1" fill="none" stroke="var(--cream-background)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>)}
      <span className="leaf-loader-ripple" />
    </span>
    <span className="leaf-loader-copy"><span className="leaf-loader-label">{label}</span>{detail && <span className="leaf-loader-detail">{detail}</span>}</span>
  </span>;
}
