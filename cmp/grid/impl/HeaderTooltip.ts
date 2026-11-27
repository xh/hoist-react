/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import type {PlainObject} from '@xh/hoist/core';
import type {IHeaderParams, ITooltipParams} from '@xh/hoist/kit/ag-grid';
import {isString, isUndefined} from 'lodash';
import type {ReactNode, RefObject} from 'react';
import {useEffect, useLayoutEffect, useRef} from 'react';

/**
 * Content of a default header tooltip - the full name of a column or group, with its
 * description if it has one.
 * @internal
 */
export interface HeaderTooltipContent {
    name: string;
    description: string;
}

/**
 * Give ag-Grid the default tooltip for the header of a Column or ColumnGroup with no tooltip of its
 * own. A header that has one - via `headerTooltip` or `agOptions` - leaves it to ag-Grid, which
 * reads it from the colDef. So does a grid with ag-Grid's `enableBrowserTooltips` option, which
 * shows tooltips as a native `title` attribute that can only hold a string.
 *
 * A description always shows, under the full name. Without one, the full name shows only when the
 * header hides it - an abbreviated, icon, or truncated label. A blank label shows nothing.
 *
 * ag-Grid replaces `setTooltip` whenever it refreshes the header, and drops any tooltip set through
 * the old one - so the effect depends on it, to set the tooltip again.
 * @internal
 */
export function useDefaultHeaderTooltip({
    setTooltip,
    api,
    labelRef,
    owner,
    name,
    description
}: {
    setTooltip: IHeaderParams['setTooltip'];
    api: IHeaderParams['api'];
    labelRef: RefObject<HTMLElement>;
    owner: {headerTooltip: string; agOptions?: PlainObject};
    name: string;
    description: string;
}) {
    useEffect(() => {
        if (
            !owner ||
            !name ||
            !isUndefined(owner.headerTooltip) ||
            !isUndefined(owner.agOptions?.headerTooltip) ||
            api.getGridOption('enableBrowserTooltips')
        ) {
            return;
        }

        // ag-Grid types the value as a string, but passes it to the tooltip component as is.
        const content: HeaderTooltipContent = {name, description};
        setTooltip(content as any, () => !!description || labelHidesName(labelRef.current, name));
    }, [setTooltip, api, labelRef, owner, name, description]);
}

function labelHidesName(label: HTMLElement, name: string): boolean {
    if (!label?.hasChildNodes()) return false;
    return !label.textContent.includes(name) || label.offsetWidth < label.scrollWidth;
}

/**
 * Tooltip component for column group headers. Column headers use the Column's own tooltip
 * component, which hands off to this one.
 * @internal
 */
export const headerTooltipComponent = (agParams: ITooltipParams) => {
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Style the container ag-Grid React mounts this component in.
    useLayoutEffect(() => {
        const classes = ['ag-tooltip', 'xh-grid-header-tooltip'],
            container = wrapperRef.current?.closest('.ag-react-container');
        container?.classList.add(...classes);
        return () => container?.classList.remove(...classes);
    }, []);

    return div({ref: wrapperRef, children: renderContent(agParams.value)});
};

function renderContent(value: string | HeaderTooltipContent): ReactNode {
    if (value == null) return null;
    if (isString(value)) return value;
    const {name, description} = value;
    return [
        div({key: 'name', className: 'xh-grid-header-tooltip__name', children: name}),
        description
            ? div({
                  key: 'desc',
                  className: 'xh-grid-header-tooltip__description',
                  children: description
              })
            : null
    ];
}
