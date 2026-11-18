# Callout Package

## Overview

`Callout` is a short note set off within a body of content. Use one for a caveat in a form, a
warning about stale data above a grid, or a success or error summary in a detail panel. It shows an icon, an
optional title and a body on a background tinted by its intent. It takes no model and works on
desktop and mobile. The props and their defaults are documented in `Callout.ts`.

Hoist has three components that look alike. Choose by where the message sits:

- **Callout** - a block inside a body of content, read along with the content around it. It has
  no buttons and does not close.
- **`Banner`** - a status strip in app or panel chrome, edge to edge, with optional close and
  action buttons. Show one with `Panel.banner` or `XH.showBanner()`. Desktop only. See
  [Panel Banners](../../desktop/cmp/panel/README.md#banners).
- **`Card`** - a bordered container that groups other components under a header, and can
  collapse. Use it for a section, not for a message.

## Usage

```typescript
import {callout} from '@xh/hoist/cmp/callout';
import {markdown} from '@xh/hoist/cmp/markdown';
import {Icon} from '@xh/hoist/icon';

// A note, with the info icon
callout({intent: 'primary', children: 'Prices are delayed 15 minutes.'})

// A title over the body
callout({
    intent: 'danger',
    title: 'Limit breach',
    children: 'VaR is 12% over its limit on the Rates desk.'
})

// A neutral callout with no intent has no icon. Pass one to add it.
callout({icon: Icon.clock(), children: 'Positions as of the close of business.'})

// Rich content in the body, such as markdown or a link
callout({
    intent: 'warning',
    title: 'Partial data',
    children: markdown({content: 'Two of five regions failed to load. [Retry](#retry)'})
})
```

Each intent has its own icon - info, success, warning and danger - so color is never the only
signal. Pass `icon` to show another, or `false` for none.

The callout is a block with no outer margin, so it fills the width of a block or a column. Space
it from its neighbors with a `gap` on its container or a `margin` layout prop. In a row such as an
`hbox`, give it a `flex` or a `width`.

A blank `title` or body renders no element, and a callout with neither renders nothing. Content
that streams in can therefore show the title first and the body as it grows.

## Styling

Set the `--xh-callout-*` variables on `body.xh-app` to change the padding, radius and colors.
The full set is in the `Callouts` block of [`styles/vars.scss`](../../styles/vars.scss). Each
intent reads a `-bg` variable for its background and a `-color` variable for its icon and left bar.
The title and body take the text color, so they read well on every tint:

```scss
body.xh-app {
  --xh-callout-accent-width: 0;
  --xh-callout-padding: var(--xh-spacing-half) var(--xh-spacing);
  --xh-callout-warning-bg: var(--xh-intent-warning-trans2);
}
```

## Common Pitfalls

- **A string body renders as plain text, not markdown.** Pass a `markdown()` element to format
  it. Hoist's `markdown` loads images, so do not pass it text from an untrusted source.
- **`markdown()` keeps line breaks by default.** Source text wrapped over several lines renders
  with hard breaks inside a paragraph. Pass `lineBreaks: false` to join the lines.
- **A callout with no `intent` is neutral and has no icon.** Set `intent: 'primary'` for a note.
- **The callout does not announce itself.** It has the `note` role, named by its title. To alert
  a screen reader to new content, put it in a live region of your own.

## Related Packages

- [`/cmp/`](../README.md) - `Card`, `Badge` and the component catalog
- [`/desktop/cmp/panel/`](../../desktop/cmp/panel/README.md) - `Panel` and its banners
