/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnSpec} from '@xh/hoist/cmp/grid';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import type {WatchlistModel} from './WatchlistModel';

/**
 * Identity for a watched instance - `ClassName:xhName` when named (stable across reloads), else
 * the transient `xhId`.
 */
export function instanceKey(className: string, xhName: string, xhId: string): string {
    return xhName ? `${className}:${xhName}` : xhId;
}

export function isNamedKey(key: string): boolean {
    return key.includes(':');
}

export const starIcon = (active: boolean) =>
    active
        ? Icon.favorite({intent: 'warning', prefix: 'fas'})
        : Icon.favorite({className: 'xh-text-color-muted'});

/** Star column toggling an instance row's Watchlist membership - shared by both instance grids. */
export function watchInstanceCol(watchlistModel: WatchlistModel): ColumnSpec {
    return {
        ...actionCol,
        colId: 'isWatched',
        displayName: 'Watchlist',
        headerName: Icon.favorite(),
        headerTooltip: 'Watchlist',
        width: calcActionColWidth(1),
        actions: [
            {
                actionFn: ({record}) => watchlistModel.toggleInstance(record),
                displayFn: ({record}) => {
                    const {xhName, isWatched} = record.data;
                    return {
                        icon: starIcon(isWatched),
                        tooltip: isWatched
                            ? 'Remove from Watchlist'
                            : xhName
                              ? 'Add to Watchlist'
                              : 'Add to Watchlist (session only - set xhName to persist)'
                    };
                }
            }
        ]
    };
}
