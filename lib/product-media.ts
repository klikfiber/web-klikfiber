const optimized = new Set(['fabeal-k33a','fabeal-kf4a','fabeal-odp-studio','fabeal-opm-studio','patch-cord-studio','ucl-cleaver','ucl-k33-studio','ucl-k33','ucl-kf4']);

// Only replace bundled originals; custom admin uploads remain authoritative.
export function productMedia(src: string) {
  const match = /^\/images\/([^/]+)\.(png|jpe?g)$/.exec(src);
  return match && optimized.has(match[1]) ? `/images/optimized/${match[1]}.webp` : src;
}
