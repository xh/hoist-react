import {ViewInfo, ViewManagerModel, ViewTree} from '@xh/hoist/core/persist/viewmanager';
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
        groups[group] = {name: group, children: [view], isMenuFolder: true};
        groupsAndLeaves.push(groups[group]);
    });

    // 2) Make ViewTree, recursing for groups
    return groupsAndLeaves.map(it => {
        const {name, isMenuFolder, children, description, token} = it;
        return isMenuFolder
            ? {
                  type: 'folder',
                  text: getFolderDisplayName(name, depth),
                  items: buildTreeInternal(children, selected, depth + 1),
                  selected: isFolderForEntry(name, selected?.name, depth)
              }
            : {
                  type: 'view',
                  text: it.shortName,
                  selected: selected?.token === token,
                  token,
                  description
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
