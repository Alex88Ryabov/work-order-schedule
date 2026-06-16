# Work Order Schedule Timeline

An interactive timeline for a manufacturing ERP. Planners can see work orders across
work centers, switch zoom levels (Hour / Day / Week / Month), and create, edit, and
delete orders from a slide-out panel with overlap validation.

Built with Angular 19 (standalone components, signals, OnPush) in TypeScript strict mode.

---

## Tech stack

| Tool | Why it's here |
|------|---------------|
| **Angular 19** (standalone + signals) | App framework. Signals drive a single service and `OnPush` rendering, so the board stays fast without manual change detection. |
| **TypeScript (strict)** | Full type safety across the data model and the date math. |
| **SCSS** | All styling. Design tokens (colors, shadows, sizes) live as CSS variables in `src/styles.scss`. |
| **Reactive Forms** | The create/edit form, including a cross-field validator for date order and overlap. |
| **@ng-select/ng-select** | The Status and Timescale dropdowns. |
| **@ng-bootstrap/ng-bootstrap** | `ngb-datepicker` for the date fields and `NgbDropdown` for the three-dot Edit/Delete menu. |
| **bootstrap** | Base styles that ng-bootstrap builds on (imported once in `styles.scss`). |
| **@popperjs/core** | Positioning engine for the datepicker and dropdown popups (used by ng-bootstrap). |

---

## Getting started

**Prerequisites:** Node.js 20 LTS (or 18.19+) and npm.

```bash
# 1. install dependencies
npm install

# 2. start the dev server
npm start          # or: ng serve

# open http://localhost:4200
```

No extra setup is needed — the Circular Std font is bundled in `public/fonts/` and the
sample data is generated on first load.

**Other commands:**

```bash
ng build           # production build into dist/
ng serve --host 0.0.0.0   # expose the dev server on the local network
```

---

## Features

**Core**
- Timeline grid with a fixed work-center column and a horizontally scrollable grid.
- Zoom levels: Hour / Day / Week / Month. All show the same data at a different scale.
- Work-order bars positioned by date, with name, status badge, and a three-dot Edit/Delete menu.
- Four status colors (Open, In progress, Complete, Blocked).
- "Today" indicator (vertical line + current-period chip), centered on load.
- Slide-out create/edit panel using Reactive Forms.
- Overlap detection: orders on the same work center can't overlap, with an inline error.

**Extras**
- localStorage persistence — edits survive a refresh.
- Infinite horizontal scroll — columns grow as you reach either edge.
- "Today" button to recenter the viewport.
- Tooltip on bar hover (name, status, full date range).
- Windowed rendering — only on-screen rows and bars are built, so the bundled sample
  board of several thousand orders stays smooth.
- Panel slide animations, keyboard support (Escape to close, Tab focus trap), custom
  datepicker styling, and ARIA roles on the dialog.

---

## Project structure

```
src/app/
├─ app.component.ts                 # root, renders the schedule page
├─ app.config.ts                    # providers (incl. the dot-format date parser)
├─ components/
│  ├─ schedule-page/                # top bar, title, Today button, timescale select
│  ├─ timeline/                     # the grid: columns, rows, bars, scroll, hover, tooltip
│  └─ work-order-panel/             # create/edit slide-out form
└─ core/
   ├─ models/        documents.ts   # NaoDocument, WorkCenter, WorkOrder, status types
   ├─ interfaces/                   # view-model shapes (rows, bars, scale, panel state)
   ├─ constants/                    # design sizes, status labels, scale specs, seed input
   ├─ services/      work-order.service.ts         # signals + persistence
   └─ utils/                        # date math, scale (date↔pixel), seed generator, RNG
```

---

## Data model

Every document follows the `docId` / `docType` / `data` shape:

```ts
interface WorkOrderDocument {
  docId: string;
  docType: 'workOrder';
  data: {
    name: string;
    workCenterId: string;          // → WorkCenterDocument.docId
    status: 'open' | 'in-progress' | 'complete' | 'blocked';
    startDate: string;             // local 'YYYY-MM-DD'
    endDate: string;               // local 'YYYY-MM-DD', inclusive
  };
}
```

Dates are stored as plain local `YYYY-MM-DD` strings (no time, no timezone) and parsed
with the local calendar, which keeps a day from drifting across timezone boundaries.
`endDate` is inclusive — a bar runs to the start of the following day.

---

## Key decisions

- **One service holds the state.** `WorkOrderService` is a plain Angular service that keeps
  the centers and orders in signals and acts as the single source of truth. Components are
  `OnPush` and read computed signals, so the UI updates without manual change detection.
- **Date ↔ pixel as the core of the grid.** Each zoom level has a small spec (column
  width, first column, count, label). Columns are always measured from `columns[0]`, so
  `dateToX` / `xToDate` convert in both directions and a date keeps its position once the
  columns to its left stop changing. This is what makes infinite scroll stable.
- **Windowed rendering.** Only the rows and bars inside the viewport (plus a little
  overscan) are built, so a board with thousands of orders renders a handful of elements.
- **One panel for create and edit.** A `PanelState` discriminated union (`mode: 'create'
  | 'edit'`) drives the same form; an `effect` resets or pre-fills it when the state changes.
- **Overlap as a form validator.** `rangesOverlap` is an inclusive check; the service's
  `findOverlap` reuses it and the form's cross-field validator surfaces the conflicting
  order's name. On edit, the order being edited is excluded.
- **Dot date format.** A custom `NgbDateParserFormatter` renders/parses `MM.DD.YYYY` to
  match the design.

---

## Sample data & persistence

On first load the app generates sample data: five named work centers plus a larger bulk
set (a few thousand non-overlapping orders) to exercise scrolling and windowed rendering.

State is saved to `localStorage` under the key `naologic.schedule.v1` after any change.
To reset to the original sample data, clear that key (or the site's storage) and reload.

---

## Responsiveness

The layout holds down to mobile widths: the work-center column narrows at ≤640px and the
grid scrolls horizontally. Horizontal scrolling on small screens is expected.

---

## `@upgrade` notes

Spots tagged `@upgrade` in the code mark deliberate, scoped follow-ups:

- **Timeline columns** — window the columns the way rows are windowed, for a truly
  unbounded range instead of the current safety cap.
- **Persistence** — move from `localStorage` to IndexedDB so a very large board never
  hits the storage quota.
- **Focus trap** — the datepicker popup mounts outside the dialog, so its days aren't
  inside the panel's tab trap. Fine for mouse use; worth revisiting for full a11y.
