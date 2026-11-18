/* Attract loop timeline (ms). Change a number here, then re-render with tools/attract/render.py. */
export const T = {
  intro: [0, 3000],
  members: [3000, 17000], // Nov 2026: 4s + 4s + 2s + 2s + 2s (must equal the ms values in Movie.jsx)
  adviser: [17000, 21000],
  group: [21000, 24000],
  sensors: [24000, 38000],
  how: [38000, 46000],
  privacy: [46000, 48000],
  outro: [48000, 50500],
};
export const LENGTH = 50500;
