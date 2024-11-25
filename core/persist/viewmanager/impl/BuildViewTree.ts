/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ViewManagerModel, ViewTree} from '../ViewManagerModel';
import {ViewInfo} from '../ViewInfo';
import {sortBy} from 'lodash';

/**
 * Create a menu-friendly, tree representation of a set of views, using the `\`
 * in view names to create folders.
 *
 * @internal
 */
export function buildViewTree(views: ViewInfo[], model: ViewManagerModel): ViewTree[] {
    views = sortBy(views, 'name');
    return buildTreeInternal(views, model.view.info, 0);
}

function buildTreeInternal(views: ViewInfo[], selected: ViewInfo, depth: number): ViewTree[] {
    // 1) Get groups and leaves at this level.
    const groups = {},
        groupsAndLeaves = [];
    views.forEach(view => {
        // Leaf Node
        if (getNameAtDepth(view.name, depth + 1) == null) {
            groupsAndLeaves.push(view);
            return;
        }
        // Belongs to an already defined group
        const group = getNameAtDepth(view.name, depth);
        if (groups[group]) {
            groups[group].children.push(view);
            return;
        }
        // Belongs to a not defined group, create it
        groups[group] = {group, children: [view]};
        groupsAndLeaves.push(groups[group]);
    });

    // 2) Make ViewTree, recursing for groups
    return groupsAndLeaves.map(it => {
        return it instanceof ViewInfo
            ? {
                  data: it,
                  selected: selected?.token === it.token
              }
            : {
                  data: {
                      folderName: getFolderDisplayName(it.group, depth),
                      children: buildTreeInternal(it.children, selected, depth + 1)
                  },
                  selected: isFolderForEntry(it.group, selected?.name, depth)
              };
    });
}

function getNameAtDepth(name: string, depth: number) {
    const arr = name?.split('\\') ?? [];
    return arr.length <= depth ? null : arr.slice(0, depth + 1).join('\\');
}

function isFolderForEntry(folderName: string, entryName: string, depth: number) {
    const name = getNameAtDepth(entryName, depth);
    return name && name === folderName && folderName.length < entryName.length;
}

function getFolderDisplayName(name: string, depth: number) {
    return name?.split('\\')[depth];
}
