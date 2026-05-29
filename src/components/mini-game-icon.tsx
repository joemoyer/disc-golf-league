import { getMiniGameLabel, type MiniGameKind } from "@/lib/mini-games";

type MiniGameIconProps = {
  kind: string;
  className?: string;
  title?: string;
};

const iconClass = "h-3.5 w-3.5 shrink-0";

export function MiniGameIcon({ kind, className = "", title }: MiniGameIconProps) {
  const label = title ?? getMiniGameLabel(kind);
  const combinedClass = `${iconClass} ${className}`.trim();

  switch (kind as MiniGameKind) {
    case "closest_to_pin":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={combinedClass}
          role="img"
          aria-hidden
        >
          <title>{label}</title>
          <path d="M5 22V14V4V2" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" />
          <path
            opacity="0.5"
            d="M5 14L7.47067 13.5059C9.1212 13.1758 10.8321 13.3329 12.3949 13.958C14.0885 14.6354 15.9524 14.7619 17.722 14.3195L17.8221 14.2945C18.4082 14.148 18.6861 13.4769 18.3753 12.9589L16.8147 10.3578C16.4732 9.78867 16.3024 9.50409 16.2619 9.19455C16.2451 9.06543 16.2451 8.93466 16.2619 8.80553C16.3024 8.49599 16.4732 8.21141 16.8147 7.64225L18.0932 5.51136C18.4278 4.95364 17.9211 4.26976 17.2901 4.42751C15.8013 4.79971 14.2331 4.69328 12.8082 4.12333L12.3949 3.95801C10.8321 3.33288 9.1212 3.1758 7.47067 3.50591L5 4.00004"
            stroke="#1C274C"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "longest_putt":
      return (
        <svg
          viewBox="-3.8 0 76.76 76.76"
          xmlns="http://www.w3.org/2000/svg"
          className={combinedClass}
          role="img"
          aria-hidden
        >
          <title>{label}</title>
          <g transform="translate(-1472.649 -50.147)">
            <path
              d="M1541.8,92.34a34.576,34.576,0,1,1-34.574-34.583A34.572,34.572,0,0,1,1541.8,92.34Z"
              fill="#f44b41"
            />
            <path
              d="M1532.648,92.34a25.425,25.425,0,1,1-25.42-25.432A25.431,25.431,0,0,1,1532.648,92.34Z"
              fill="#f4f4f4"
            />
            <path
              d="M1523.135,92.34a15.907,15.907,0,1,1-15.907-15.91A15.9,15.9,0,0,1,1523.135,92.34Z"
              fill="#f44b41"
            />
            <path
              d="M1514.365,92.34a7.141,7.141,0,1,1-7.137-7.138A7.144,7.144,0,0,1,1514.365,92.34Z"
              fill="#f4f4f4"
            />
            <path
              d="M1508.356,92.924a1.478,1.478,0,1,1-2.682-1.244L1522.2,56.27a1.483,1.483,0,1,1,2.688,1.251Z"
              fill="#163844"
            />
            <path
              d="M1521.954,56.841l-2.432-6.694-6.041,12.936,2.427,6.691Z"
              fill="#27b7ff"
            />
            <path
              d="M1525.255,68.586l-6.682,2.422,6.031-12.935,6.676-2.429Z"
              fill="#27b7ff"
            />
          </g>
        </svg>
      );
    case "shortest_drive":
      return (
        <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" className={combinedClass} role="img" aria-hidden>
          <title>{label}</title>
          <path
            fill="#77B255"
            d="M9.842 19.922c0 9.842 6.575 9.673 5.158 10.078c-7 2-8.803-7.618-9.464-7.618c-2.378 0-5.536-.423-5.536-2.46C0 17.883 2.46 15 6.151 15c2.379 0 3.691 2.883 3.691 4.922zM36 28.638c0 1.104-3.518-.741-5 0c-2 1-2-.896-2-2s1.343-1 3-1s4 1.895 4 3z"
          />
          <path
            fill="#77B255"
            d="M16.715 33.143c0 2.761-1.279 2.857-2.857 2.857S11 35.903 11 33.143c0-.489.085-1.029.234-1.587c.69-2.59 2.754-5.556 4.052-5.556c1.578 0 1.429 4.382 1.429 7.143zm8.571 0c0 2.761 1.278 2.857 2.856 2.857C29.721 36 31 35.903 31 33.143a6.26 6.26 0 0 0-.234-1.587C30.075 28.966 28.012 26 26.714 26c-1.578 0-1.428 4.382-1.428 7.143z"
          />
          <path
            fill="#3E721D"
            d="M32 27c0 4-5.149 4-11.5 4S9 31 9 27c0-6.627 5.149-12 11.5-12S32 20.373 32 27z"
          />
          <circle fill="#292F33" cx="5" cy="18" r="1" />
          <path
            fill="#5C913B"
            d="M23.667 25.1c0 3.591-1.418 3.9-3.167 3.9s-3.167-.31-3.167-3.9S18.75 17 20.5 17s3.167 4.51 3.167 8.1zM30 24c.871 3.482-.784 4-2.533 4c-1.749 0-2.533.69-2.533-2.9s-1.116-6.5.633-6.5C27.315 18.6 29 20 30 24zm-13.933 1.1c0 3.591-.785 2.9-2.534 2.9s-3.404-.518-2.533-4c1-4 3.251-5.4 5-5.4c1.75 0 .067 2.91.067 6.5z"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={combinedClass} role="img" aria-hidden>
          <title>{label}</title>
          <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z" />
        </svg>
      );
  }
}

export function MiniGameIconBadge({
  kind,
  prize,
  overlay = false,
}: {
  kind: string;
  prize: string | null;
  overlay?: boolean;
}) {
  const label = getMiniGameLabel(kind);
  const tooltip = prize ? `${label} — ${prize}` : label;
  return (
    <span
      className={
        overlay
          ? "inline-flex items-center justify-center rounded-full bg-white p-px shadow ring-1 ring-slate-200"
          : "inline-flex items-center justify-center rounded bg-white/90 p-0.5 shadow-sm ring-1 ring-slate-200"
      }
      title={tooltip}
    >
      <MiniGameIcon kind={kind} title={tooltip} className={overlay ? "h-3 w-3" : undefined} />
    </span>
  );
}
