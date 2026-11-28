### 🎁 New Features

* Overhauled the Hoist Inspector into a standalone developer tool, now opening in its own browser
  window (one per app tab) with top-level `Objects` and `Memory` tabs. Allow popups for the app's
  origin - if the window is blocked, the Inspector deactivates with a toast.
    * Objects: star any instance or property to keep it in view on a new `Watchlist` tab - starred
      instances with an `xhName` persist across reloads. Unnamed instances are now hidden by
      default, behind an `Anon` quick filter.
    * Memory: stats are persisted per browser tab, so trends leading up to a reload survive it, and
      a new button forces a GC when Chrome is launched with `--js-flags=--expose-gc`.
