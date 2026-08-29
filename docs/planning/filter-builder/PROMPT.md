# FilterBuilder Project

## Prompt

We need to build a new component called FilterBuilder with a backing FilterBuilderModel.

As the name implies, this component is dedicated to viewing, editing, and creating Hoist filters, and should be inspired on the model side in large part by FilterChooserModel, which will be a natural companion along with the GridFilterModel. Review the hoist documentation, data package, and these components thoroughly to understand how they work and interrelate, and how filters in general are constructed and operate in hoist.

This new component will provide an alternate UI for filter construction that is panel-based, so not attempting to fit into grid headers or a single OmniBox-style input, but instead taking the space needed to allow the user to construct filters of arbitrary complexity and depth, including compound filters with multiple clauses.

It can be heavily inspired by React Query Builder and similar prior art, and researching this and coming up with a set of best practices that mesh well with Hoist filtering abilities is a key part of the project.

In all ways, this should be a first-class idiomatic Hoist component using Hoist componentry, utilities, and patterns all the way down.

Like FilterChooserModel, it should support persistence. The ability to save and reload favorite filters is also desirable for feature parity.

This component could also allow us to support function filters, but they would need to somehow be selected from a curated library supplied by the developer. That seems like an advanced feature that we could bucket for a Phase 2 and deliberately NOT include in the initial implementation, which can deal with FieldFilters and CompoundFilters only, much as filter chooser does.

We should ensure that the component's internals scroll smoothly and are usable across a variety of potential sizes, as this component will be nested into various areas of different application UIs depending on their specific needs.

It should almost certainly include a drag-and-drop ability to reorder or re-nest clauses, as that is a common operation and users likely expect dnd functionality. Research prior art / other library comparisons, and let's decide before we begin implementation if this is an essential v1 feature or would be deferred for later v2 work. Note that we have a GitHub issue around a pending upgrade to the drag and drop library we use. It might be beneficial for us to complete that task before we implement any new drag and drop work in the framework here.

Consider all of these factors, research Library comparisons, investigate the drag and drop angle, then come up with a list of any questions or clarifications you require so that we can map out a formal execution plan and begin work.

-------

## Follow-up questions 1

1. Working-tree vs. live-edit model: Should changes be "staged" (user edits a working copy, then clicks Apply to
   commit the filter)? Or should each individual edit immediately update the bound filter? FilterChooser uses
   immediate binding. A staged approach is more typical for query builders and prevents partial/invalid filters
   from being applied mid-edit. My recommendation: staged with Apply/Cancel for v1.
2. Relationship to FilterChooser: Should FilterBuilderModel be usable as a companion to FilterChooserModel (both
   bound to the same target, staying in sync)? Or should it be a standalone alternative? The companion approach
   seems powerful — users could use the OmniBox for quick filtering and switch to the builder for complex
   construction. If so, should they share a FilterChooserFieldSpec config, or should FilterBuilder have its own
   field spec type?
3. File organization: I'd place the model in cmp/filter/ alongside FilterChooserModel and the desktop component
   in desktop/cmp/filter/. The internal working-tree nodes would go in cmp/filter/impl/. Sound right?
4. Operator restrictions per field type: FilterChooserModel's FilterChooserFieldSpec already has ops
   configuration (allowed operators per field). Should FilterBuilder reuse this directly, or do we need more
   granular control (e.g., different default operator sets for the builder UI vs. the chooser)?
5. DnD upgrade sequencing: Should we merge the DnD library upgrade (branch 3918) into develop now as a
   prerequisite, even though FilterBuilder v1 won't use DnD? Getting it merged sooner reduces future merge
   conflicts and addresses the deprecation.
6. Mobile support: Should we plan for a mobile/cmp/filter/FilterBuilder variant, or is this desktop-only for
   now?
7. Toolbar/action bar: Should the component include a built-in toolbar with Apply/Cancel/Clear/Reset buttons, or
   should those be left to the consuming app to provide? (I'd lean toward a configurable built-in bbar with
   reasonable defaults.)
8. "Interop" with GridFilterModel: GridFilterModel manages per-column filters. Should FilterBuilder be able to
   read/display filters that were set via grid column headers, and vice versa? This seems valuable but adds
   complexity — could be a v1.5 feature.


### Answers

1. Implement with Hoist `commitOnChange` pattern.  If false, show apply/cancel buttons in filterBuilder UI. If true, sync immediately to bound target.
2. As with existing FilterChooser + GridFilter, if they are bound to the same target the bi-directional binding should do its thing and they should be in perfect sync.  The question of the field spec interface is an interesting one - we should examine if the `FilterChooserFieldSpec` has knobs in it that would not apply here, or vice-versa.  Very open to a parent interface to span both, or adjusting the name if needed. We should consider this holistically along with the grid filtering package.
3. Mirroring FilterChooser prior art a good plan. We should be careful to allow future addition of a mobile-specific UI. Anything in root (cross-platform) /cmp must be truly cross-platform. Anything that uses desktop components needs to be in desktop/cmp.
4. Operator handling seems like it should be the same. We should support the full set of expected operators.
5. We'll review the Drag-and-Drop upgrade sequencing, but if we're not using Drag-and-Drop in this project, then it's a completely separate concern.
6. We should plan for a mobile variant, but we should build one later after we have a working cross-platform model and desktop-specific implementation.
7. Yes, agreed on the B-Bar. I think this is where favourite support could also live. See above note regarding commit on change.
8. Ensure you understand the integration point where we're syncing to a filtered target, such as a store, cube view, or actual filter. That's how the bidirectional binding and state sharing works. Your question about interop with grid filter model makes me question whether or not you fully understand the pattern.

Other items:
- Note that the empty stage should use our placeholder component.
- I would like to enable not or negation per group. That sounds like a useful feature that should be possible to build in and would be best to consider from the start.
- I'd like to leverage our collapsible card and/or field set component for the collapsible groups. It feels like that card component with its built-in collapsibility is an excellent candidate for holding clause-level information. This is not an absolute necessity, but it feels like a good re-use story that should work.


------

## Follow-up questions 2

1. Renaming BaseFilterFieldSpec → FilterFieldSpec — This is clean (only 2 importers) but touches the data/
   package. Want to do it now as part of this work, or defer?
2. CompoundFilter not support — Adding this to the core data model is the cleanest approach and enables
   round-trip serialization. However, it would need corresponding support in hoist-core (Java side) to be fully
   useful for server-side filtering. Should we proceed, or implement negation purely at the UI/working-tree level
   for now (losing the not flag on save/reload)?
3. Toolbox example — Should the Toolbox example be part of this work, or handled separately?
4. Ready to begin implementation? If so, I'd start with Phase 0 + Phase 1 (data model enhancements + model),
   then Phase 2 (component), then Phase 3 (polish).

### Answers

1. Fine on that rename
2. CompoundFilter not support - explain further if that's a core feature of other prior art you researched, and expand a bit more on how it would work. I am open to the idea and we can schedule the hoist-core work easily enough, just want to understand the value proposition or how it might be an expectation users of the other libraries could have
3. Toolbox example is a great idea - and essential to testing this.  Absolutely make that part of the plan, building it as we go so you can then use it to iteratively refine the UI and test functionality by driving it in the browser
4. Incorporate the above, then I have one process question before we start.
