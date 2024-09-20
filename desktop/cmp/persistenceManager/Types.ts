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
    value: T;
}

export type PersistenceViewTree = {
    text: string;
    selected: boolean;
} & (
    | {
          type: 'directory';
          items: PersistenceViewTree[];
      }
    | {
          type: 'view';
          id: number;
      }
);
