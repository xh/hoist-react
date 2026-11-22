# Changelog fragments

Each pull request adds its changelog entries here, in a new markdown file, instead of editing
`CHANGELOG.md`. A release assembles every fragment into `CHANGELOG.md` under the real version
number, then deletes them.

This means that pull requests never conflict over `CHANGELOG.md`, and an entry can never land
under a version that has already shipped.

Entry conventions are in [`docs/changelog-format.md`](../docs/changelog-format.md).

## Add an entry

For a one-line entry, run `pnpm changelog add`. It names the file for your branch and finds the
section from a short name:

```bash
pnpm changelog add fix "Fixed a crash when the widget had no data."
```

For more than that, run `pnpm changelog new` to create `changelog.d/<branch>.md`, or create the
file yourself. Write it as you would write the entries in `CHANGELOG.md`, with the same `###`
section headings and bullets, but with no version heading:

```markdown
### 🎁 New Features

* Added a widget that does a thing.

### 🐞 Bug Fixes

* Fixed a crash when the widget had no data.
```

- Use only the sections listed in `changelog.d/config.json`. You can leave the emoji off a
  heading. The release adds it.
- Bullets can wrap and can hold sub-bullets.
- To change an entry before release, edit its fragment. After release, edit `CHANGELOG.md`.
- Release-level notes, such as an upgrade difficulty or topic groups, are added when the release
  is curated. Leave them out of fragments.

## Commands

`pnpm changelog` runs `xh-changelog`, from `@xh/hoist-dev-utils`.

- `pnpm changelog add <section> "<text>"` - add one entry to your branch's fragment.
- `pnpm changelog new` - create an empty fragment for your branch.
- `pnpm changelog check` - validate the fragments. CI runs this on each pull request.
- `pnpm changelog preview` - print the next release as it will be assembled.
- `pnpm changelog release <version>` - assemble the release into `CHANGELOG.md` and delete the
  fragments. Review and curate the result, then commit.
