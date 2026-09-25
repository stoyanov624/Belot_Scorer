# Sheets and popovers on the native dialog and popover APIs, not vaul

The roadmap planned bottom sheets on vaul. By Phase 4 vaul had seen no release since December 2024 and its README declares it unmaintained. The browser now provides what the spec asks for: `<dialog>` with `showModal()` gives a modal in the top layer with a focus trap, Esc to close and a `::backdrop` to tap. The `popover` attribute gives light dismiss for the declaration popover. `src/ui/Sheet.tsx` and `src/ui/Popover.tsx` wrap them, and `popoverPosition` places the popover next to its avatar. There are no dependencies, and React Native will need its own sheet anyway.

## Considered Options

- vaul: adds swipe-to-dismiss, but it's unmaintained and future React releases may break it.
- Radix Dialog/Popover: maintained, but a dependency for what the platform now does natively.

## Consequences

No swipe-down-to-dismiss (the spec doesn't ask for it). The sheet slide-in and popover fade are CSS keyframes in `src/index.css`, turned off under `prefers-reduced-motion`.
