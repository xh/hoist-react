/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {MenuItem, MenuItemLike} from '@xh/hoist/core';
import {compact, split} from 'lodash';
import type {DashViewSpec} from '../DashViewSpec';

/**
 * A group of view specs, built from their `groupName`. A slash-delimited name nests groups - e.g.
 * a spec with `groupName: 'Charts/Line'` sits in group 'Line', within group 'Charts'.
 * @internal
 */
export class ViewSpecGroup<T extends DashViewSpec = DashViewSpec> {
    /** One segment of a `groupName` - the name shown for this group. */
    readonly name: string;

    /** Nested groups and view specs, in the order each first appears in the source specs. */
    readonly children: ViewSpecNode<T>[] = [];

    constructor(name: string) {
        this.name = name;
    }

    /** All view specs within this group, including those within its nested groups. */
    get allViewSpecs(): T[] {
        return this.children.flatMap(it => (it instanceof ViewSpecGroup ? it.allViewSpecs : it));
    }
}

/** @internal */
export type ViewSpecNode<T extends DashViewSpec = DashViewSpec> = ViewSpecGroup<T> | T;

/**
 * Arrange view specs into groups by their `groupName`, split on '/' into nested groups. Blank
 * segments are ignored and surrounding spaces trimmed, so `Charts / Line` matches `Charts/Line`.
 *
 * @returns top-level groups and ungrouped specs, in the order each first appears.
 * @internal
 */
export function groupViewSpecs<T extends DashViewSpec>(viewSpecs: T[]): ViewSpecNode<T>[] {
    const root = new ViewSpecGroup<T>(null);
    viewSpecs.forEach(viewSpec => {
        let parent = root;
        compact(split(viewSpec.groupName, '/').map(it => it.trim())).forEach(name => {
            let group = parent.children.find(
                it => it instanceof ViewSpecGroup && it.name === name
            ) as ViewSpecGroup<T>;
            if (!group) {
                group = new ViewSpecGroup<T>(name);
                parent.children.push(group);
            }
            parent = group;
        });
        parent.children.push(viewSpec);
    });
    return root.children;
}

/**
 * Create menu items for adding views, nesting specs into submenus by their `groupName`. Groups
 * and specs are listed in the order each first appears.
 *
 * @param viewSpecs - specs to list, in their defined order.
 * @param createItem - creates the menu item for a single spec.
 * @internal
 */
export function createViewSpecMenuItems<T extends DashViewSpec>(
    viewSpecs: T[],
    createItem: (viewSpec: T) => MenuItem
): MenuItemLike[] {
    const toMenuItems = (nodes: ViewSpecNode<T>[]): MenuItemLike[] =>
        nodes.map(it =>
            it instanceof ViewSpecGroup
                ? {text: it.name, items: toMenuItems(it.children)}
                : createItem(it)
        );

    return toMenuItems(groupViewSpecs(viewSpecs));
}
