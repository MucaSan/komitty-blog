export function Logo({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Komitty"
      role="img"
    >
      <defs>
        <linearGradient id="komitty-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.366" stopColor="#078FE4" />
          <stop offset="0.591" stopColor="#057EC9" />
          <stop offset="0.909" stopColor="#036CAE" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" rx="20" fill="url(#komitty-grad)" />
      <path
        d="M28 31.625 L28 21.5625 C28 18.5125 29.212 15.587 31.368 13.431 C33.525 11.274 36.45 10.063 39.5 10.063 C42.55 10.063 45.475 11.274 47.632 13.431 C49.788 15.587 51 18.5125 51 21.5625 L51 31.625"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M55.313 31.625 L23.688 31.625 C18.924 31.625 15.063 35.487 15.063 40.25 L15.063 60.375 C15.063 65.139 18.924 69 23.688 69 L55.313 69 C60.076 69 63.938 65.139 63.938 60.375 L63.938 40.25 C63.938 35.487 60.076 31.625 55.313 31.625 Z"
        fill="#FFFFFF"
      />
      <circle cx="39.5" cy="47.438" r="5.75" fill="#057EC9" />
      <rect x="36.625" y="51.75" width="5.75" height="7.188" rx="1.4375" fill="#057EC9" />
    </svg>
  );
}
