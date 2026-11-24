### ⚙️ Typescript API Adjustments

* `DashViewModel.titleDetails` now takes a `ReactNode`, not only a string. A `DashCanvas` view
  shows it in its own element after the title, and a `DashContainer` tab shows only a string or
  number.

### ✨ Styles

* `PanelHeader` now sizes its title with `flex` from `.xh-panel-header__title` in the stylesheet,
  not inline, so app CSS can size the title against the header's items.
* `DashCanvas` view headers now show `titleDetails` in `.xh-dash-tab__title-details`, so apps can
  style it apart from the title.
