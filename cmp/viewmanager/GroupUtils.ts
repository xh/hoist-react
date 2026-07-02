/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isEmpty} from 'lodash';
import type {ViewInfo} from './ViewInfo';

/**
 * Delimiter used within view group names to express nesting - e.g. `Reports/Sales/Monthly` is the
 * `Monthly` group nested two levels down within `Reports`. Groups remain plain strings on their
 * persisted JsonBlobs - nesting is a display-time interpretation of this delimiter.
 */
export const VIEW_GROUP_DELIMITER = '/';

/** Node within a tree of views built from their slash-delimited group paths. */
export interface ViewGroupNode {
    /** Leaf segment of this group's path - i.e. its display name. */
    name: string;
    /** Full delimited path to this group. */
    path: string;
    /** Child groups nested within this group, sorted alpha. */
    children: ViewGroupNode[];
    /** Views directly within this group, sorted alpha by name. */
    views: ViewInfo[];
}

/** Split a group path into its segments. Null/empty path returns an empty array. */
export function splitGroupPath(path: string): string[] {
    return path ? path.split(VIEW_GROUP_DELIMITER) : [];
}

/** Leaf segment of a group path - e.g. 'Reports/Sales' returns 'Sales'. Null path returns null. */
export function getGroupLeaf(path: string): string {
    const segments = splitGroupPath(path);
    return segments.length ? segments[segments.length - 1] : null;
}

/** Parent of a group path - e.g. 'Reports/Sales' returns 'Reports'. Top-level/null returns null. */
export function getGroupParent(path: string): string {
    const segments = splitGroupPath(path);
    return segments.length > 1 ? segments.slice(0, -1).join(VIEW_GROUP_DELIMITER) : null;
}

/** Compose a parent path and leaf name into a full path. Either side may be null/empty. */
export function composeGroupPath(parent: string, leaf: string): string {
    return [parent, leaf].filter(Boolean).join(VIEW_GROUP_DELIMITER) || null;
}

/**
 * Normalize a group path - trim each segment, drop any empty segments (handling values such as
 * 'a//b', '/a', or 'a/ '), and rejoin. Returns null if nothing remains.
 */
export function normalizeGroupPath(path: string): string {
    if (!path) return null;
    const segments = splitGroupPath(path)
        .map(it => it.trim())
        .filter(Boolean);
    return segments.length ? segments.join(VIEW_GROUP_DELIMITER) : null;
}

/** True if `candidate` is the same group path as `ancestor` or is nested anywhere beneath it. */
export function isGroupSameOrDescendant(candidate: string, ancestor: string): boolean {
    if (!candidate || !ancestor) return false;
    return candidate === ancestor || candidate.startsWith(ancestor + VIEW_GROUP_DELIMITER);
}

/**
 * All distinct group paths across the given views, including implied ancestor paths - a view in
 * 'A/B/C' implies groups 'A', 'A/B', and 'A/B/C'. Returned in depth-first order with sibling
 * groups sorted alpha, suitable for rendering as an indented hierarchy.
 */
export function getAllGroupPaths(views: ViewInfo[]): string[] {
    const {roots} = buildViewGroupTree(views),
        ret = [];
    const visit = (node: ViewGroupNode) => {
        ret.push(node.path);
        node.children.forEach(visit);
    };
    roots.forEach(visit);
    return ret;
}

/**
 * Build a tree of groups and their member views from the views' slash-delimited group paths.
 * Sibling groups and views are sorted alpha at every level. Ungrouped views returned separately.
 */
export function buildViewGroupTree(views: ViewInfo[]): {
    roots: ViewGroupNode[];
    ungrouped: ViewInfo[];
} {
    const roots: ViewGroupNode[] = [],
        ungrouped: ViewInfo[] = [];

    views.forEach(view => {
        const segments = splitGroupPath(view.group);
        if (isEmpty(segments)) {
            ungrouped.push(view);
            return;
        }

        let children = roots,
            path = '',
            node: ViewGroupNode = null;
        segments.forEach(segment => {
            path = composeGroupPath(path, segment);
            node = children.find(it => it.name === segment);
            if (!node) {
                node = {name: segment, path, children: [], views: []};
                children.push(node);
            }
            children = node.children;
        });
        node.views.push(view);
    });

    sortTree(roots);
    ungrouped.sort(alphaByName);
    return {roots, ungrouped};
}

//------------------
// Implementation
//------------------
function sortTree(nodes: ViewGroupNode[]) {
    nodes.sort(alphaByName);
    nodes.forEach(it => {
        sortTree(it.children);
        it.views.sort(alphaByName);
    });
}

function alphaByName(a: {name: string}, b: {name: string}): number {
    return a.name.localeCompare(b.name);
}
