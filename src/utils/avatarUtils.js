export const getInitialsSvgDataUrl = (name) => {
  const cleanName = name || '?';
  const initials = cleanName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
    
  // Standard app subtle slate-grey background (matching ui-avatars default color)
  const bgColor = '#334155'; 

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" fill="${bgColor}"/>
    <text x="50%" y="54%" font-size="38" font-family="system-ui, -apple-system, sans-serif" font-weight="700" fill="#ffffff" dominant-baseline="middle" text-anchor="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const handleAvatarError = (e, name) => {
  // Prevent infinite loops if the fallback itself fails (which shouldn't happen, but is good practice)
  if (e.target.dataset.fallbackTriggered) return;
  e.target.dataset.fallbackTriggered = 'true';
  e.target.src = getInitialsSvgDataUrl(name);
};
