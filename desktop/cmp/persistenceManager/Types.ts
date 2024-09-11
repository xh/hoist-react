import {PlainObject} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';

export interface PersistenceView<T extends PlainObject = PlainObject> {
    id: number;
    acl: string;
    archived: boolean;
    dateCreated: LocalDate;
    description: string;
    lastUpdated: LocalDate;
    lastUpdatedBy: string;
    name: string;
    owner: string;
    token: string;
    type: string;
    group: string;
    isShared: boolean;
    isFavorite: boolean;
    value: T;
}

export interface TreeView {
    itemType: string;
    text: string;
    items?: TreeView[];
    selected?: boolean;
    key?: number;
}
