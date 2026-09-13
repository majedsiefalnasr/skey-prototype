import {defineConfig, devices} from '@playwright/test';

// Baseline (frozen, port 4174) and current (live source, port 4173) are
// started separately by `node scripts/serve.mjs ...` (Tasks 1-2) or
// `npm run dev` (Task 3+) — Playwright connects to whichever is already
// running rather than starting a second process on either port, per the
// plan. Tests pick their target via PARITY_URL (see tests/parity.spec.mjs).
const DEFAULT_BASE_URL = 'http://127.0.0.1:4173';

// Snapshot path is keyed by project (viewport/theme/RTL/motion vary the
// rendered pixels, so each of the 7 projects below needs its own expected
// image per surface) but deliberately NOT by platform/OS (Playwright's
// default template would add that) — that's what lets a baseline capture
// (port 4174) and a later candidate run (port 4173) of the SAME project
// compare against the exact same expected image regardless of which OS runs
// the suite.
const snapshotPathTemplate = '{testDir}/{testFilePath}-snapshots/{projectName}/{arg}{ext}';

export default defineConfig({
  testDir: './tests',
  snapshotPathTemplate,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.PARITY_URL ?? DEFAULT_BASE_URL,
    trace: 'retain-on-failure',
    // The launchpad's search-label typing animation
    // (startSearchTyping/runSearchTyping in concepts/app-shell.html) is a
    // JS setTimeout loop, not CSS — Playwright's `animations: 'disabled'`
    // screenshot option cannot freeze it, but the app already checks
    // `matchMedia('(prefers-reduced-motion: reduce)')` itself and skips
    // starting the animation when it matches. Every project below shares
    // this same reduced-motion setting so the maxDiffPixels:0 static
    // captures are reproducible; normal (non-reduced) motion is exercised
    // by a separate, non-pixel-diffing test, never mixed into this matrix.
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 1440, height: 900},
      },
    },
    {
      name: 'mobile-touch',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 390, height: 844},
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop-dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 1440, height: 900},
        // The app's #theme select defaults to "system" and listens for
        // `(prefers-color-scheme: dark)` changes (applyTheme/syncSystemTheme
        // in concepts/app-shell.html) — this is that same existing control,
        // driven through its real media-query input rather than by setting
        // data-theme directly.
        colorScheme: 'dark',
      },
    },
    {
      name: 'desktop-high-contrast-light',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 1440, height: 900},
        colorScheme: 'light',
        // #high-contrast checkbox mirrors `(prefers-contrast: more)` at
        // boot and on change (systemContrastQuery listener) — same
        // existing-control mechanism as dark mode above.
        contrast: 'more',
      },
    },
    {
      name: 'desktop-high-contrast-dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 1440, height: 900},
        colorScheme: 'dark',
        contrast: 'more',
      },
    },
    {
      name: 'mobile-rtl',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 390, height: 844},
        isMobile: true,
        hasTouch: true,
        // There is no OS-level media query for text direction, so this
        // project's `rtl: true` is read by tests/support/browser.mjs's
        // `boot()` (via test.info().project.use.rtl) and applied by
        // checking the existing #rtl control, which dispatches the app's
        // real `change` handler (applyLocale('ar')) — never by setting
        // dir="rtl" directly.
        rtl: true,
      },
    },
    {
      // Verifies the app's own `@media (prefers-reduced-motion: reduce)`
      // CSS rules render correctly — distinct from the top-level
      // `reducedMotion: 'reduce'` default (shared by every project above
      // for stabilization), which this project also inherits.
      name: 'desktop-reduced-motion',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 1440, height: 900},
      },
    },
  ],
});
