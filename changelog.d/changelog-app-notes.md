### 🎁 New Features

* Enhanced `ChangelogDialog` to render release notes as markdown, so code spans, links, bold text
  and sub-bullets show as written. Apps need `@xh/hoist-dev-utils` 16.6, which also keeps wrapped
  lines. Older builds supply plain text, which the dialog shows as before.
* Refreshed the `ChangelogDialog` layout. Each version shows its number, release date and a
  "Current" or "Unreleased" tag, with a header that stays in view while its notes scroll. Section
  headings show an icon and intent color, and links open in a new tab. `ChangelogVersion` adds
  `date` and `isUnreleased`.

### 🐞 Bug Fixes

* Fixed `ChangelogService` showing the "What's New" prompt for an unreleased SNAPSHOT version, which
  a user could never mark as read. The prompt now tracks the latest released version.
