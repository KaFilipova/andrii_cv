# Andrii Filipov — interview presentation

An interview deck that runs as one continuous 3D scene. Eleven stations sit on a
wide ring; the camera flies between them. The copy is DOM, the world is WebGL,
and neither drives the other's frame loop.

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc, strict
npm run build      # dist/, static — drop it on any host
```

## Controls

| Input | Does |
| --- | --- |
| `→` `↓` `Space` `Enter` | Next station |
| `←` `↑` `Backspace` | Previous station |
| `1`–`9`, `0` | Jump straight to a slide — for when an interviewer asks about one thing |
| `Home` / `End` | First / last |
| Scroll | Next / previous |
| Horizontal swipe | Next / previous |
| Vertical swipe | Scrolls the copy panel on a phone — never changes the slide |
| Mouse move | Parallax; on the stack station it nudges the spin |

The address bar carries the slide: `…/#luciad` opens on the geospatial station.
That makes a follow-up email able to point at one slide, and it is how the
screenshot script drives the deck.

```bash
npm run shots        # dev server must be running; writes shots/*.png
npm run shots:phone  # the same eleven at 390×844
```

## Architecture

Two worlds, one boundary — the same split as a game engine, for the same reason:
React re-renders on intent, the engine runs every frame, and mixing them makes
both slow.

| Layer | Owns | Never does |
| --- | --- | --- |
| `src/engine`, `src/scene`, `src/camera` | canvas, WebGL, the frame loop | import React |
| `src/ui`, `src/app/App.tsx` | the copy, the nav rail, the loader | run per-frame logic through React state |

[`src/app/Deck.ts`](src/app/Deck.ts) is the only file that touches both. Input
goes into the deck store; the store is what moves the camera, so a click on a
nav dot and a press of `→` take exactly the same path.

```
src/
├── content/slides.ts     all copy, in one file — edit the talk here
├── state/deckStore.ts    which slide is on, and whether the camera is moving
├── app/Deck.ts           the boundary: input → store → camera
├── engine/Engine.ts      renderer, resize, frame loop
├── camera/CameraRig.ts   bezier travel between stations, pointer parallax
├── scene/
│   ├── World.ts          places every station on the ring, culls, fans out frames
│   ├── builders.ts       wire boxes, markers, SDF labels, grids
│   ├── palette.ts        one palette, mirrored by the CSS custom properties
│   └── stations/*.ts     one file per slide
└── ui/                   the DOM overlay
```

### Adding or changing a station

1. Add an entry to `SLIDES` in `src/content/slides.ts`.
2. Add `src/scene/stations/<id>.ts` exporting a `StationFactory`.
3. Register it in the `FACTORIES` map in `src/scene/World.ts`.

A station is authored in a comfortable local frame — subject at the origin,
camera somewhere along `+Z` — and the world rotates it into its place on the
ring. A station file never needs to know where in the deck it ended up.

`bias` on a station pans the camera sideways so the DOM copy and the subject do
not sit on top of each other: positive pushes the subject to screen-right, which
is what a left-aligned slide wants. On a narrow window the pan drops to zero,
because there is no room beside the text.

### What each station shows

| Slide | Station | What is actually animating |
| --- | --- | --- |
| Title | `hero` | A core in three tilted rings — establishes the material language |
| Who I am | `whoami` | Three monoliths with a scan sweep |
| Stack | `stack` | Two orbits: daily inside, reach-for outside. Pointer nudges the spin |
| Career | `arc` | Bars grow out of a year rail on arrival |
| Configurator | `configurator` | A trade-fair stand assembling in catalogue order, ports flashing as joints close, running total climbing with it |
| Rules | `mechanics` | Left: turn → twist → slide → seated. Right: flush is accepted, penetration is not |
| Trade-offs | `tradeoffs` | Five layers, one pulse, travelling one way only |
| Geospatial | `luciad` | A scanned city, three buildings dropping onto cleared plots with coordinates |
| Real-time | `realtime` | A fuse-assembly arm on a pick-and-place loop, next to a monitoring wall |
| How I work | `howiwork` | spec → agent → review → ship, with the loop back from review |
| Contact | `contact` | The title core, opened out into five spokes |

## On a phone

Under 900px the deck stops putting the copy beside the subject and stacks:
the scene keeps the top of the screen, the copy becomes a panel across the
bottom that scrolls on its own, and the camera is re-framed to match.

[`camera/framing.ts`](src/camera/framing.ts) owns that re-framing, and both the
engine and the world read it from there so the two cannot drift apart. A phone
held upright has about a quarter of the horizontal field of a 16:9 screen, so:

- the lens opens as the window narrows, winning some of the angle back without
  the distortion a very wide lens gives;
- the camera backs off for the rest, until the subject spans the width it was
  authored for;
- the camera then pans **down**, which lifts the subject into the clear air
  above the copy. The lift is matched to the `--mobile-copy` share in the
  stylesheet — change one and change the other.

Gestures are split by axis on purpose: horizontal swipes move the deck,
vertical ones scroll the copy. A gesture that sometimes scrolls and sometimes
changes the slide is the kind of control nobody can use while talking.

`npm run shots:phone` renders the stacked layout through real device emulation,
not a narrow window — Windows refuses to open a browser window under 500px, so
`--window-size=390,844` silently lays out at 500px and crops, which makes a
phone screenshot a convincing lie.

## Deliberate choices worth knowing

- **Fonts are bundled, not fetched.** An interview room is exactly where a
  captive portal would ruin the typography. The same two `.woff` files feed the
  CSS and the in-scene SDF labels (troika reads `.woff`, never `.woff2`).
- **Copy is DOM, world is WebGL.** Text in a texture does not scale with the
  window, does not survive someone else's projector and cannot be read by a
  screen reader. The overlay is pointer-transparent, so a drag that starts over
  the copy still reaches the scene.
- **The canvas carries an explicit CSS size** (`setSize(w, h, true)`), and is
  positioned with `top`/`left` rather than `inset: 0`. A canvas is a replaced
  element: absolutely positioned with `width: auto` it takes its *intrinsic*
  size — the drawing buffer — and the `right`/`bottom` offsets are dropped as
  over-constrained. At `devicePixelRatio` 1 the buffer happens to match the
  viewport and nothing looks wrong, which is exactly why this survives a
  desktop review and breaks on every phone and retina laptop.
- **Labels are billboarded through the parent's world rotation**, not by copying
  the camera's quaternion — every station is rotated into its place on the ring,
  so the naive version leaves every label turned by the station's yaw.

## Before the interview

- `src/content/slides.ts` carries a `TODO` on the geospatial slide: confirm the
  client, the period and the exact scope of the LuciadRIA work.
- The numbers on the configurator station (prices, booth size) are plausible
  placeholders chosen to make the total readable, not figures from the product.
