### 🐞 Bug Fixes

* Addressed potential memory leaks:
    * Grid column header filters could retain models after closing.
    * Mobile `Navigator` could retain pages replaced by a route change.
    * `Sparkline` tooltips could retain first-render props.
    * `DashContainer` could retain old layouts after a rebuild.
    * Hoist components could retain their first-render props until unmount.
    * `useOnResize`, `useOnVisibleChange` and `useOnScroll` could hold on to the callback from the
      first render rather than the latest one.

### ⚙️ Technical

* `InstanceManager` now holds models, stores, cubes and views weakly, so models that are never
  destroyed can still be garbage collected.
