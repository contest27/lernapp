// The story registry. Chapters live as JSON under data/story/<arc>/<id>.json
// and are precached by the service worker; their MP3s deliberately are NOT (they
// go to the long-lived media cache instead, exactly as Watch episodes do in
// PowerMath Trainer).
//
// `beat` is the narrative position. Several chapters may share a beat when an
// arc offers the same story moment at different reading levels — the story
// order is fixed, the band only picks the variant.

export const ARCS = [
  {
    id: 'signal',
    title: 'Signal',
    blurb: 'A salvage robot wakes in a forest that does not want him there.',
    chapters: [
      { id: 'signal-01', beat: 1, level: 3, title: 'The Long Fall' },
      { id: 'signal-02', beat: 2, level: 3, title: 'Rust and Rain' },
      { id: 'signal-03', beat: 3, level: 4, title: 'The Watcher' },
      { id: 'signal-04', beat: 4, level: 4, title: 'Cold Night' },
      { id: 'signal-05', beat: 5, level: 4, title: 'The Crate' },
      { id: 'signal-06', beat: 6, level: 5, title: 'Fire' },
      { id: 'signal-07', beat: 7, level: 5, title: 'The Bridge' },
      { id: 'signal-08', beat: 8, level: 5, title: 'The Nest' },
      { id: 'signal-09', beat: 9, level: 6, title: 'The Drone' },
      { id: 'signal-10', beat: 10, level: 6, title: 'Hiding' },
      { id: 'signal-11', beat: 11, level: 6, title: 'The Antenna' },
      { id: 'signal-12', beat: 12, level: 6, title: 'The Choice' },
    ],
  },
];

export function arcById(id) {
  return ARCS.find((a) => a.id === id) ?? ARCS[0];
}

export function allChapterPaths() {
  return ARCS.flatMap((a) => a.chapters.map((c) => `./data/story/${a.id}/${c.id}.json`));
}
