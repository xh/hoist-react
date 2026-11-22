### 🎁 New Features

* Enhanced `ChangelogDialog` to render release notes as markdown, so code spans, links, bold text
  and sub-bullets show as written. Apps need `@xh/hoist-dev-utils` 17, which also keeps wrapped
  lines. Older builds supply plain text, which the dialog shows as before.
* Refreshed the `ChangelogDialog` layout. Each version shows its number, release date and a
  "Current" or "Unreleased" tag, with a header that stays in view while its notes scroll. Section
  headings show an icon and intent color, and links open in a new tab. `ChangelogVersion` adds
  `date` and `isUnreleased`.
