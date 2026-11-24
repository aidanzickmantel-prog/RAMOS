/* RAMOS story site: the one switch.
 *
 * EDITION
 *   'committee'  full version for the committee, collaborators and partners
 *                (private link). Shows collaborator-only elements with flags:
 *                engine-run worked examples, audit counts, parameter ids,
 *                ADR numbers and file paths in the method tabs.
 *   'public'     hides every collaborator-only element on screen.
 *
 * Switching to 'public' here only HIDES those elements. For anything that
 * leaves the private link, build the public cut instead, which also removes
 * them from the files:  python3 tools/make_public.py   (writes site/public_cut/)
 *
 * RENDERS
 *   Slots for the realistic 3D renders (05_VISUAL_ASSETS.md s6). While a slot
 *   is null the scene shows its drawn schematic. To drop a render in, give a
 *   frame sequence scrubbed by scroll, for example
 *   '3D6': { frames: 'img/renders/3D6/frame_', ext: '.webp', count: 120, alt: '...' }
 */
window.RAMOS_CONFIG = {
  EDITION: 'partner',
  /* S01 background. Drop a photo of olive prunings or a burning pile into img/ and set
   * src, plus a credit line (your own photo, or one with a licence that allows reuse).
   * While src is null the hero shows a live 3D night scene of a smouldering pile. */
  HERO: { src: null, credit: '', alt: '' },
  RENDERS: {
    '3D1': null, // S07 olive grove in winter
    '3D2': null, // S08 five fates
    '3D3': null, // S09 split screen
    '3D4': null, // S11 roadside pile and crew
    '3D5': null, // S12 truck towing a hand-fed chipper
    '3D6': null, // S15 continuous pyrolysis plant
    '3D7': null, // S16 digestion and upgrading site
    '3D8': null, // S17 gasifier island
    '3D9': null, // S20 soil cross-section
    '3D10': null // S23 morph
  }
};
