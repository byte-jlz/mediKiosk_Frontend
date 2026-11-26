// Small line-icon set (24x24, drawn with plain shapes so no icon library is needed).
const PATHS = {
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
  queue: <><circle cx="4.5" cy="6.5" r="1.3" /><circle cx="4.5" cy="12" r="1.3" /><circle cx="4.5" cy="17.5" r="1.3" /><path d="M9 6.5h11M9 12h11M9 17.5h7" /></>,
  patients: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.9c1.9.7 3.1 2.4 3.5 5.1" /></>,
  staff: <><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="2.2" /><path d="M5.8 16c.5-1.5 1.7-2.3 3.2-2.3s2.7.8 3.2 2.3M14.5 10h4M14.5 13.5h3" /></>,
  clinic: <><path d="M4 21V8l8-5 8 5v13" /><path d="M12 9v6M9 12h6" /><path d="M9 21v-3h6v3" /></>,
  kiosk: <><rect x="3" y="4" width="18" height="12" rx="2.5" /><path d="M9 20h6M12 16v4" /></>,
  activity: <path d="M3 12h4l2.5-7 4 14 2.5-7H21" />,
  audit: <><rect x="5" y="4" width="14" height="17" rx="2.5" /><path d="M9 4.5V3.5h6v1M8.5 10h7M8.5 14h7M8.5 17.5h4" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  'eye-off': <><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 4.4-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="m3 3 18 18" /></>,
  key: <><circle cx="8" cy="15" r="3.5" /><path d="m10.5 12.5 8-8M15.5 7.5l2.5 2.5M13.5 9.5l2 2" /></>,
  logout: <><path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10" /><path d="M14 8l4 4-4 4M18 12H9" /></>,
  alert: <><path d="M12 4 2.8 19.5h18.4L12 4Z" /><path d="M12 10v4.5M12 17.2v.1" /></>,
  recheck: <><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v4.5h-4.5" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v4.5h-4.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
};

export default function Icon({ name, size = 22, className = '', strokeWidth = 1.8 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
