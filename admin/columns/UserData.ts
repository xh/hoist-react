/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {badge} from '@xh/hoist/cmp/badge';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';
import {Intent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {truncate} from 'lodash';
import {ReactElement} from 'react';

export const value: ColumnSpec = {
    field: {name: 'value', type: 'auto'},
    width: 200,
    autosizeMaxWidth: 400,
    renderer: truncateValue
};

export const defaultValue: ColumnSpec = {
    field: {name: 'defaultValue', type: 'auto'},
    width: 200,
    autosizeMaxWidth: 400,
    renderer: truncateIfJson
};

export const userValue: ColumnSpec = {
    field: {name: 'userValue', type: 'auto'},
    flex: true,
    minWidth: 200,
    renderer: truncateIfJson
};

export const valueType: ColumnSpec = {
    field: {
        name: 'valueType',
        type: 'string',
        displayName: 'Type'
    },
    width: 90,
    align: 'center',
    renderer: v => valueTypeRenderer(v)
};

/** Renders a config value type (json, string, int, bool, pwd...) as an icon + colored badge. */
export function valueTypeRenderer(valueType: string): ReactElement {
    if (!valueType) return null;
    const {icon, intent} = VALUE_TYPE_BADGES[valueType] ?? {};
    return badge({
        item: valueType,
        icon: icon?.(),
        intent,
        className: 'xh-value-type-badge'
    });
}

const VALUE_TYPE_BADGES: Record<string, {icon: () => ReactElement; intent?: Intent}> = {
    json: {icon: () => Icon.json(), intent: 'primary'},
    bool: {icon: () => Icon.checkSquare(), intent: 'success'},
    int: {icon: () => Icon.calculator(), intent: 'warning'},
    long: {icon: () => Icon.calculator(), intent: 'warning'},
    double: {icon: () => Icon.calculator(), intent: 'warning'},
    pwd: {icon: () => Icon.lock(), intent: 'danger'},
    string: {icon: () => Icon.list()}
};

export const groupName: ColumnSpec = {
    field: {
        name: 'groupName',
        type: 'string',
        displayName: 'Group'
    },
    width: 100
};

export const clientVisible: ColumnSpec = {
    field: {name: 'clientVisible', type: 'bool'},
    ...Col.boolCheck,
    displayName: 'Client?',
    width: 75
};

function truncateIfJson(value, {record}) {
    return record.data.type === 'json' ? truncateValue(value) : value?.toString();
}

function truncateValue(value) {
    return truncate(value, {length: 500});
}
