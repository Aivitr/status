# Design System: Muxi Status

Clean, high-precision technical telemetry dashboard for real-time engineering visibility.

## Color System (OKLCH)

### Backgrounds & Surfaces (Clean Light Mode)
- `--canvas-bg`: `oklch(0.985 0.004 240)` (Crisp technical off-white)
- `--panel-surface`: `oklch(1.0 0 0)` (Pure white card surfaces)
- `--panel-subtle`: `oklch(0.965 0.005 240)` (Secondary surface / header / code block)
- `--panel-border`: `oklch(0.88 0.01 240)` (Crisp technical structural border)
- `--panel-border-subtle`: `oklch(0.92 0.005 240)` (Inner gridlines & dividers)

### Typography & Ink
- `--text-primary`: `oklch(0.20 0.02 240)` (Deep technical slate ink, contrast > 11:1)
- `--text-secondary`: `oklch(0.45 0.02 240)` (Secondary labels and metadata, contrast > 5.5:1)
- `--text-muted`: `oklch(0.55 0.015 240)` (Timestamps and guide markings, contrast > 4.5:1)

### Status & Telemetry Accents
- `--status-success`: `oklch(0.62 0.17 145)` (Emerald CI pass / Synced)
- `--status-running`: `oklch(0.65 0.15 225)` (Cerulean blue active build / in-progress)
- `--status-warning`: `oklch(0.72 0.16 75)` (Amber warning / behind branch / threshold alert)
- `--status-danger`: `oklch(0.58 0.22 25)` (Crimson CI failure / merge conflict)
- `--accent`: `oklch(0.52 0.20 255)` (Precision technical cobalt brand accent)

## Typography

- **Display & Section Headings**: Inter / Geist Sans, font-weight 600, letter-spacing -0.02em.
- **Metric Values & Telemetry**: Geist Mono / JetBrains Mono, `font-variant-numeric: tabular-nums`, font-weight 500/600.
- **Micro Labels & Axis Guides**: Geist Mono, uppercase, 10px-11px, letter-spacing 0.06em.

## Grid & Layout Structure

- **Bento Grid**: 12-column responsive layout with compact 12px / 16px gutters.
- **Cards**: Sharp 6px-8px border radius, 1px solid `--panel-border`. No heavy blur shadows.
- **Precision Markers**: Subtle crosshair ticks at card corner boundaries to evoke instrument precision.

## Motion & Transitions

- Pulse indicator: Subtle 2s opacity ease on status beacon.
- Sparklines & Charts: Bezier smoothing on SVG line renders with instantaneous data swaps under reduced motion.
- All animations respect `@media (prefers-reduced-motion: reduce)`.
