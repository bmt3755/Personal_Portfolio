# Manjeera Thogarcheti — Portfolio

An immersive personal portfolio for **Manjeera Thogarcheti, AI & Systems Lead**. A scroll-driven "architect's desk" journey dives through six human-in-the-loop multi-agent case studies, followed by a framework-decision record. Built for technical hiring managers and AI engineering leads.

## Tech stack

- **Next.js 15** (App Router) + **React 19**
- **JavaScript** (no TypeScript)
- **framer-motion** — scroll-linked journey, reveals, count-up preloader
- **lenis** — smooth-scroll momentum
- **lucide-react** — icons
- Inline styles + a single `globals.css` (no Tailwind)
- Google Fonts: Fraunces, Inter, JetBrains Mono

## Project structure

```
app/
  layout.js        # root layout, metadata, fonts, preloader + smooth-scroll wrappers
  page.js          # page shell: theme tokens, content data, nav, hero, framework table
  Journey.js       # scroll-dive centerpiece (desk -> 6 project tiles -> desk)
  Preloader.js     # count-up preloader overlay
  SmoothScroll.js  # lenis smooth-scroll provider
  globals.css      # global styles, animations, the HITL stamp
public/
  images/          # desk hero + 6 case-study scenes
```

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Design notes

- **HITL stamp** — every case study carries a "Human in the Loop" stamp marking the exact moment control returns to a person. It is the signature element of the site.
- **Accessibility** — honors `prefers-reduced-motion`: the scroll journey swaps to a static stacked gallery, and smooth-scroll / entrance animations drop out.
- **Theme** — a warm/purple dark palette driven by a single set of color tokens.

## License

All Rights Reserved — see [LICENSE](LICENSE).
