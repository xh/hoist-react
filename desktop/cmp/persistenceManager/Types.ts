import {PlainObject} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';

export interface PersistenceView<T extends PlainObject = PlainObject> {
    acl: string;
    archived: boolean;
    dateCreated: LocalDate;
    description: string;
    id: number;
    lastUpdated: LocalDate;
    lastUpdatedBy: string;
    name: string;
    owner: string;
    token: string;
    type: string;
    group: string;
    isShared: boolean;
    value: T;
}
