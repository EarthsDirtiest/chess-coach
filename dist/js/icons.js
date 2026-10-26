const paths = {
  crown:'M3 6l4 4 5-7 5 7 4-4-2 13H5L3 6zm3 17h12',
  analyze:'M20 20l-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM10 7v6m-3-3h6',
  games:'M6 3h9l4 4v14H6V3zm9 0v5h4M9 11h7m-7 4h7m-7 3h4',
  practice:'M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  coach:'M3 8l9-5 9 5-9 5-9-5zm4 3v6c3 3 7 3 10 0v-6m4-3v8',
  chart:'M3 3v18h18M7 16l4-5 4 2 6-8m-4 0h4v4',
  user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21v-3a8 8 0 0 1 16 0v3',
  menu:'M3 5h18M3 12h18M3 19h18', close:'M5 5l14 14M5 19 19 5',
  first:'M6 5v14m11-14-7 7 7 7', last:'M18 5v14M7 5l7 7-7 7',
  prev:'M15 5l-7 7 7 7', next:'M9 5l7 7-7 7', play:'M8 4l12 8-12 8V4z', pause:'M8 4v16M16 4v16',
  flip:'M4 8a8 8 0 0 1 14-3l3 3m0-6v6h-6M20 16a8 8 0 0 1-14 3l-3-3m0 6v-6h6',
  engine:'M8 4h8v16H8V4zM4 8h4m8 0h4M4 12h4m8 0h4M4 16h4m8 0h4M11 8h2m-2 4h2m-2 4h2',
  check:'M5 12l4 4L19 6', star:'M12 2l3 6 7 1-5 5 1 8-6-3-6 3 1-8-5-5 7-1 3-6z',
  target:'M21 12a9 9 0 1 1-9-9m0 5a4 4 0 1 0 4 4m-4 0 9-9m-5 0h5v5',
  shield:'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4zM12 6v11',
  book:'M12 5c-3-2-7-2-10 0v15c3-2 7-2 10 0 3-2 7-2 10 0V5c-3-2-7-2-10 0zm0 0v15',
  alert:'M12 3l10 18H2L12 3zm0 6v5m0 3v1', settings:'M5 4v16m7-16v16m7-16v16M2 9h6m1 6h6m1-8h6',
  upload:'M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6', link:'M10 13l4-4m-6 7H6a4 4 0 0 1-3-7l4-4a4 4 0 0 1 6 0m-2 14a4 4 0 0 0 6 0l4-4a4 4 0 0 0-3-7h-2',
};
export function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[name] || paths.target}"/></svg>`;
}
export function hydrateIcons(root = document) {
  for (const element of root.querySelectorAll('[data-icon]')) element.innerHTML = icon(element.dataset.icon);
}
