/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {badge} from '@xh/hoist/cmp/badge';
import {ColumnSpec, dateTimeSec} from '@xh/hoist/cmp/grid';
import {XH} from '@xh/hoist/core';
import {dateTimeRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import copy from 'clipboard-copy';

export const badgeCol: ColumnSpec = {
    autosizable: false,
    width: 100,
    renderer: badgeRenderer
};

export function badgeRenderer(v) {
    return v
        ? badge({
              item: v,
              className: 'xh-badge-col',
              style: {cursor: 'copy'},
              title: 'Double-click to copy',
              onDoubleClick: () => {
                  copy(v);
                  XH.toast({
                      icon: Icon.copy(),
                      message: `Copied ${v}`
                  });
              }
          })
        : '-';
}

export const description: ColumnSpec = {
    field: {name: 'description', type: 'string'},
    flex: true,
    minWidth: 200
};

export const name: ColumnSpec = {
    field: {name: 'name', type: 'string'},
    width: 200
};

export const note: ColumnSpec = {
    field: {
        name: 'note',
        type: 'string',
        displayName: 'Notes'
    },
    minWidth: 60,
    flex: true,
    tooltip: true
};

export const notes: ColumnSpec = {
    field: {name: 'notes', type: 'string'},
    minWidth: 60,
    flex: true,
    tooltip: true
};

export const timestampNoYear: ColumnSpec = {
    field: {name: 'timestamp', type: 'date'},
    ...dateTimeSec,
    renderer: dateTimeRenderer({fmt: 'MMM DD HH:mm:ss.SSS'})
};

export const type: ColumnSpec = {
    field: {name: 'type', type: 'string'},
    width: 100
};
