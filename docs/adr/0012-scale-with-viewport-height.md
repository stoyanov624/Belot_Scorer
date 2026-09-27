# Scale the table, end screen, setup and sheets with the viewport height

The handoff sizes the screens in fixed pixels for a 390×844 phone. In a laptop browser window (landscape, often 650–720px tall), the table needed ~816px, the end screen ~800px, and the resolve sheet pushed «Напред» below the fold, so every screen scrolled. The product owner asked (2026-09-27) for the screens to fit without scrolling in a laptop browser.

- **The table** (`Seat.tsx`, `Coaster.tsx`, `table.tsx`) caps its width-driven sizes with a height term: `min(<existing vw clamp>, k·dvh)`. On a portrait phone the height term never binds (`h/w ≥ 1.67`), so the phone layout is unchanged. On a laptop the avatars, the coaster and the gaps shrink with the window.
- **The end screen and setup** use fixed pixels, so their height scaling is applied only under Tailwind's `landscape:` variant (`landscape:text-[clamp(28px,4dvh,40px)]` and so on). Portrait phones keep the handoff's sizes exactly. The end screen's avatar size goes through the `--end-avatar` CSS variable, because `Avatar` sizes itself with an inline style.
- **Sheets:** `SheetActions` (`src/ui/Sheet.tsx`) makes a sheet's closing button row sticky at the bottom of its scroll area, so the actions stay visible when a tall sheet scrolls. It must be the sheet's last child. It's used by the deal-end steps, the contract sheet and the theme sheet. The resolve card puts its name and card chips on one line when the sheet is wide enough, and they wrap on a phone as in mockup 07.
- Every scaled size has a floor, and tap targets stay at least 44px.

## Consequences

- Verified by measuring `scrollHeight` in a real browser at 1280×720, 1280×650, 1440×900 and 390×844. Unit tests can't measure layout.
- A phone held in landscape also gets the scaled end and setup screens, which is an improvement there.
- Portrait phones still scroll where they did before: setup at 390×844 (+143px) and the end screen (+20px). That's out of scope here, since the handoff's phone sizes are kept exactly.
