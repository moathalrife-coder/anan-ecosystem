/**
 * علامة عنان — بديل مؤقت حتى يصل ملف الشعار الرسمي (SVG).
 * عند وصوله: ضعه في public/brand/anan-mark.svg واستبدل هذا المكوّن.
 */
export function Mark({ size = 34, tone = "white" }: { size?: number; tone?: "white" | "navy" }) {
  const fg = tone === "white" ? "#ffffff" : "#1b2d52";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="عنان" style={{ flex: "none" }}>
      <rect x="2" y="2" width="36" height="36" rx="11" fill="none" stroke={fg} strokeWidth="2.5" opacity="0.9" />
      <circle cx="28" cy="12" r="4" fill="#f6881f" />
      <text
        x="18"
        y="27"
        textAnchor="middle"
        fontFamily="var(--font-alexandria), sans-serif"
        fontWeight={700}
        fontSize="17"
        fill={fg}
      >
        ع
      </text>
    </svg>
  );
}
