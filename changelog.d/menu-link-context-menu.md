### 🎁 New Features

* Added `MenuItem.href` and `MenuItem.target`, which render a menu item as a link. Users can open
  it in a new tab or window with a modifier key, a middle-click, or the browser's right-click menu.
  Desktop and mobile menus both support it. Use it in place of Blueprint's `menuItem` with an
  `href`.
* Enhanced desktop menus to show the browser's own menu on a right-click on a link, including one
  in an item's `rightElement`. Elsewhere in a menu, a right-click still shows nothing.
