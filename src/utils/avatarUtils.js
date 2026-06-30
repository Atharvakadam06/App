const colors = [
  '#4f46e5', // indigo
  '#0891b2', // cyan
  '#0d9488', // teal
  '#059669', // emerald
  '#ca8a04', // yellow/amber
  '#db2777', // pink
  '#e11d48', // rose
  '#2563eb', // blue
  '#7c3aed', // violet
];

export const getInitialsSvgDataUrl = (name) => {
  const cleanName = name || '?';
  const initials = cleanName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
    
  // Hash name to pick a stable color
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  const bgColor = colors[colorIndex];

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
