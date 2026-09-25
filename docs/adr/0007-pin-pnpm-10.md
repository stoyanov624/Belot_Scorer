# Pin pnpm 10 via packageManager

`package.json` declares `"packageManager": "pnpm@10.32.1"`. pnpm 12 enables `minimumReleaseAge` (24 h) by default and refused to install a lockfile written by pnpm 10 that contained packages published the same day. Pinning the version that wrote the lockfile makes installs reproducible, and pnpm (9.7+) and corepack switch to it automatically. The cost is losing pnpm 12's supply-chain delay, so before adding dependencies check that new versions aren't hours old.

## Consequences

Upgrading pnpm is a deliberate change: bump `packageManager`, run `pnpm install`, commit the lockfile, and update this ADR.
