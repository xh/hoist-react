import {PlainObject} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';

export interface View<T extends PlainObject = PlainObject> {
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

export type ViewTree = {
    text: string;
    selected: boolean;
} & (
    | {
          type: 'directory';
          items: ViewTree[];
      }
    | {
          type: 'view';
          token: string;
      }
);
