'use client';
export default function CustomerAvatar({
  value = 'blue',
  name = 'Avatar',
}: {
  value?: string;
  name?: string;
}) {
  if (value.startsWith('data:image/'))
    return <img className="customer-avatar" src={value} alt={`Foto ${name}`} />;
  const colors: Record<string, string[]> = {
    blue: ['#e4efff', '#0757bd', '#ff9800'],
    orange: ['#fff0d9', '#dc6400', '#0757bd'],
    mint: ['#ddf7e9', '#168267', '#ff9800'],
    purple: ['#eee7ff', '#7751bf', '#ff9800'],
  };
  const [bg, body, accent] = colors[value] || colors.blue;
  return (
    <svg
      className="customer-avatar"
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Avatar ${name}`}
    >
      <rect width="100" height="100" rx="30" fill={bg} />
      <path
        d="M49 27V17q0-6 8-6"
        fill="none"
        stroke={body}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="60" cy="11" r="6" fill={accent} />
      <rect x="18" y="29" width="64" height="52" rx="20" fill={body} />
      <rect x="27" y="39" width="46" height="31" rx="12" fill="white" />
      <circle cx="39" cy="50" r="4" fill={body} />
      <circle cx="61" cy="50" r="4" fill={body} />
      <path
        d="M42 59q8 8 16 0"
        fill="none"
        stroke={body}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="26" cy="61" r="5" fill={accent} />
      <circle cx="74" cy="61" r="5" fill={accent} />
    </svg>
  );
}
