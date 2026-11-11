/**
 * All presentation copy lives here, and nowhere else.
 *
 * The 3D world and the DOM overlay both read this list: the station modules in
 * `src/scene/stations/` are keyed by the same `id`, so adding a slide is adding
 * an entry here plus a station builder. Order in this array is the order of the
 * talk and the order of the camera rail.
 */

export type SlideAlign = 'left' | 'center' | 'right'

export interface Metric {
  value: string
  label: string
}

export interface Bullet {
  title: string
  body: string
}

export interface ContactRow {
  key: string
  value: string
  href?: string
}

export interface Slide {
  /** Matches the station id in `src/scene/stations`. */
  id: string
  /** Short label for the bottom rail. */
  nav: string
  kicker: string
  /** `<em>` marks the accent-coloured part. */
  title: string
  lead: string
  align?: SlideAlign
  metrics?: Metric[]
  bullets?: Bullet[]
  note?: string
  contact?: ContactRow[]
  /** Shown in the bottom-right when the station can be touched. */
  interaction?: string
}

export const PROFILE = {
  name: 'Andrii Filipov',
  role: 'Frontend Engineer',
  location: 'Tbilisi, Georgia',
  email: 'andrijfilipov73@gmail.com',
  phone: '+995 579 112 005',
  github: 'github.com/filipovandrij',
  telegram: '@AndriiFilipov',
}

export const SLIDES: Slide[] = [
  {
    id: 'hero',
    nav: 'Title',
    kicker: 'Interview presentation',
    title: 'Andrii <em>Filipov</em>',
    lead: 'Frontend Engineer — interactive 3D configurators, geospatial scenes and real-time interfaces.',
    align: 'center',
    metrics: [
      { value: 'Three.js / WebGL', label: 'Rendering layer, hands-on' },
      { value: 'React · Vue 3 · TS', label: 'Application layer' },
      { value: 'Node.js · WS', label: 'Where the frontend ends' },
    ],
    note: 'Press → or scroll to move through the scene. Every section is a place in one 3D world, not a separate slide.',
  },

  {
    id: 'whoami',
    nav: 'Who I am',
    kicker: '01 · Who I am',
    title: 'I build interfaces that have to be <em>correct</em>, not only pretty',
    lead:
      'Five years of production frontend, the last three of them in the part of the stack where a wrong pixel is a wrong answer: product configurators, geospatial scenes and operator panels driving real hardware.',
    metrics: [
      { value: '5+ yrs', label: 'Shipping production frontend' },
      { value: '3 roles', label: 'As tech lead or team lead' },
      { value: '2 ecosystems', label: 'React and Vue 3, same engineer' },
    ],
    bullets: [
      {
        title: 'The rendering layer first-hand',
        body:
          'Three.js, WebGL and Pixi.js directly — not only through wrappers. I can explain what a frame costs and why.',
      },
      {
        title: 'Architecture, not just features',
        body:
          'I owned the design of the configurator core: where the truth lives, which layer may import three.js, how an edit becomes a request.',
      },
      {
        title: 'End-to-end when it is needed',
        body:
          'Node.js services, REST and WebSockets, a Python backend when the team needed it. I follow a bug from the viewport to the endpoint.',
      },
    ],
  },

  {
    id: 'stack',
    nav: 'Stack',
    kicker: '02 · Stack',
    title: 'What I actually <em>work with</em>',
    lead:
      'Grouped by what it is for, not by how it looks on a CV. The inner ring is daily, the outer ring is what I reach for when the project asks for it.',
    align: 'right',
    bullets: [
      {
        title: 'Graphics and real-time',
        body: 'Three.js, React Three Fiber, WebGL, Pixi.js, three-mesh-bvh, WebSockets, Socket.io, WebRTC.',
      },
      {
        title: 'Application',
        body: 'TypeScript, React, Next.js, Vue 3, Zustand, Redux, Pinia, MobX, Tailwind, MUI, Vuetify.',
      },
      {
        title: 'Beyond the browser',
        body: 'Node.js, REST APIs, PostgreSQL, MongoDB, background jobs and workers, Chrome Extensions, React Native.',
      },
      {
        title: 'Tooling',
        body: 'Vite, Webpack, Git, Docker — and AI coding agents used with written specs and project rules.',
      },
    ],
    interaction: 'Drag to orbit the stack',
  },

  {
    id: 'arc',
    nav: 'Career',
    kicker: '03 · Career arc',
    title: 'Seven roles, <em>four</em> kinds of problem',
    lead: 'Grouped by domain rather than listed chronologically — the thread is interactive graphics and real-time state.',
    bullets: [
      {
        title: '3D and CAD-like tooling — 2025 to now',
        body: 'AttractGroup. Configurator architecture, rendering performance, multi-user editing.',
      },
      {
        title: 'Real-time and hardware — 2022, 2024 to 2025',
        body: 'New Wiring Technologies: a robotic-arm operator interface. WhoCPA: WebRTC monitoring at 30 simultaneous feeds.',
      },
      {
        title: 'Automation and extensions — 2023 to 2025',
        body: 'AINSYS and Python Automation Masters. Chrome Extensions, AI-backed workflows, Node.js services, tech lead.',
      },
      {
        title: 'Games and learning — 2021 to 2023',
        body: 'Creative Fun Planet and freelance. Three.js and Pixi.js games, embedded Unity builds, React Native.',
      },
    ],
    note: 'Education: Physical and Rehabilitation Medicine, 2013–2023. Ukrainian native, English B2.',
  },

  {
    id: 'configurator',
    nav: 'Configurator',
    kicker: '04 · Deep dive · 3D configurator',
    title: 'A trade-fair stand, <em>assembled</em> in the browser',
    lead:
      'At AttractGroup I work on a configurator where a dealer lays out a full exhibition stand from a real manufacturer catalogue — in 3D, with live pricing, and with the guarantee that what they draw can actually be built.',
    align: 'right',
    metrics: [
      { value: 'Metres', label: 'Positions in metres, rotations in radians — one convention' },
      { value: 'One doc', label: 'The scene is a projection of the document' },
      { value: 'Live', label: 'Multiple dealers in one project over WebSocket' },
    ],
    note:
      'React, TypeScript, Vite, three.js, zustand, three-mesh-bvh against a Django REST backend. I designed the assembly architecture and reworked the rendering core.',
    interaction: 'Watch the parts mate',
  },

  {
    id: 'mechanics',
    nav: 'Rules',
    kicker: '05 · Deep dive · How it holds together',
    title: 'Three rules the whole thing <em>rests on</em>',
    lead: 'Each one is a single named place in the codebase. That is the point — two opinions about whether a part fits is two different applications.',
    bullets: [
      {
        title: 'Parts snap by ports, not by eye',
        body:
          'Five port kinds — female, male, fixed, external and a keyed direction port. Groups mate whole: equal counts or no match. The key angle is defined once, so a notch drawn at one angle can never be mated at another.',
      },
      {
        title: 'Touching is not colliding',
        body:
          'Ports mate flush by construction, so a correct placement always has surfaces in contact. Broad-phase AABB, then a BVH test on merged volumes, then real penetration on all three axes past a tolerance derived from the port unit scale.',
      },
      {
        title: 'The document is the truth',
        body:
          'The old editor kept the truth in the scene graph and expressed intent as queues of diffs against Object3D uuids. With a document, "pending" stops being a data structure and becomes the difference between two values.',
      },
    ],
    interaction: 'Ports highlight on contact',
  },

  {
    id: 'tradeoffs',
    nav: 'Trade-offs',
    kicker: '06 · Deep dive · Decisions',
    title: 'Every decision has a <em>cost</em>',
    lead: 'Naming the cost is the part that matters. These are the four I would defend in review.',
    align: 'right',
    bullets: [
      {
        title: 'Five layers with a one-way dependency arrow',
        body:
          'domain → api → state → render → ui. The domain imports neither React nor three.js, so the rules can be reasoned about without a browser. Cost: more indirection, and discipline to never shortcut from render into api.',
      },
      {
        title: 'Rewrite the core instead of patching the editor',
        body:
          'A hand-written reconciler and a diff queue per feature could not be extended safely. Cost: a migration window with the legacy editor alive beside the new builder.',
      },
      {
        title: 'Stage edits locally, diff before sending',
        body:
          'An edit lands in a pending store, is folded into the effective variant, and only then becomes a PATCH. The stand and the price move in the same frame. Cost: a second state to keep honest.',
      },
      {
        title: 'Warm the collision volumes before the drag',
        body:
          'BVH volumes are built once per product root ahead of the gesture so a drag never pays for them mid-motion. Cost: memory, plus invalidation rules when geometry changes.',
      },
    ],
  },

  {
    id: 'luciad',
    nav: 'Geospatial',
    kicker: '07 · Deep dive · Geospatial',
    title: 'Real buildings on a <em>scanned</em> city',
    lead:
      'Work with LuciadRIA: a scanned, georeferenced city as the base layer, and complete 3D building objects placed onto its territory — exactly where the client needs them, at coordinates that hold up against survey data.',
    metrics: [
      { value: 'Survey base', label: 'Scanned city mesh, not a decorative map' },
      { value: 'Geodetic', label: 'Placement in real reference coordinates' },
      { value: 'Full objects', label: 'Whole buildings, not markers' },
    ],
    bullets: [
      {
        title: 'The map is evidence, not decoration',
        body:
          'The base layer is scanned reality, so a placement can be checked against the ground rather than against a rendering of it.',
      },
      {
        title: 'The same discipline as the configurator',
        body:
          'A placement has to be defensible, not merely plausible — the coordinate system, the units and the tolerance are decided once and written down.',
      },
    ],
    note: 'TODO — confirm client, period and the exact scope of this engagement before the interview.',
    interaction: 'Buildings drop onto the grid',
  },

  {
    id: 'realtime',
    nav: 'Real-time',
    kicker: '08 · Breadth',
    title: 'Where else I have done <em>this</em>',
    lead: 'Three earlier projects with the same shape: a live source of truth outside the browser, and an interface that has to stay in step with it.',
    align: 'right',
    bullets: [
      {
        title: 'Operator interface for a robotic arm',
        body:
          'New Wiring Technologies. Manual control plus visualization of autonomous assembly of automotive fuses. WebSockets kept on-screen motion in step with the robot; Three.js and Pixi.js views showed fuse placement and collisions. Shipped to production and still in use.',
      },
      {
        title: 'Thirty simultaneous camera feeds',
        body: 'WhoCPA. WebRTC monitoring built into a large Sencha Ext JS CRM used by managers, delivery staff and call-centre operators.',
      },
      {
        title: 'Browser games that had to teach',
        body: 'Creative Fun Planet. Three.js and Pixi.js quizzes and games, Unity builds embedded into the web app, plus the React Native companion.',
      },
    ],
  },

  {
    id: 'howiwork',
    nav: 'How I work',
    kicker: '09 · Working style',
    title: 'How I <em>work</em> today',
    lead: 'Fewer principles than most lists, because these are the ones I can show in the code.',
    bullets: [
      {
        title: 'One rule, one named place',
        body: 'If two tools can disagree about the same question, that is a bug waiting. The rule gets a file and a name, and callers become thin wrappers.',
      },
      {
        title: 'Documentation that points at code',
        body: 'Every claim names the file it can be checked against. A page nobody trusts costs more than no page at all.',
      },
      {
        title: 'AI agents as a bounded pair',
        body: 'Cursor, Claude Code and Codex daily — with written specs, project rule files and review. They move me faster; they do not get unreviewed scope.',
      },
      {
        title: 'Lead by making the work estimable',
        body: 'In three roles I turned requirements into user stories and tasks, defined the API contract with the backend, and reviewed what shipped.',
      },
    ],
  },

  {
    id: 'contact',
    nav: 'Contact',
    kicker: 'Thank you',
    title: 'Happy to go <em>deeper</em> on any of this',
    lead: 'The configurator, the geospatial work and the robot interface all have more detail than a slide holds. Ask, and I will open the part you care about.',
    align: 'center',
    contact: [
      { key: 'Email', value: PROFILE.email, href: `mailto:${PROFILE.email}` },
      { key: 'Telegram', value: PROFILE.telegram, href: 'https://t.me/AndriiFilipov' },
      { key: 'GitHub', value: PROFILE.github, href: `https://${PROFILE.github}` },
      { key: 'Phone', value: PROFILE.phone, href: `tel:${PROFILE.phone.replace(/\s/g, '')}` },
      { key: 'Based in', value: PROFILE.location },
    ],
  },
]

export const SLIDE_IDS = SLIDES.map((s) => s.id)
