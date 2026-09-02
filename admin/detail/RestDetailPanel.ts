/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {naSpan, valOrNa} from '@xh/hoist/admin/AdminUtils';
import {form, FormModel} from '@xh/hoist/cmp/form';
import {filler, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, HoistProps, PersistOptions} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {button} from '@xh/hoist/desktop/cmp/button';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {isString, startCase} from 'lodash';
import {ReactElement, ReactNode} from 'react';
import {RestDetailModel} from './RestDetailModel';

export interface RestDetailPanelProps extends HoistProps<RestDetailModel> {
    /** Icon for the panel header and empty-state placeholder. */
    icon: ReactElement;
    /** Placeholder text when no single record is selected. */
    emptyText?: string;
    /** Default width in pixels. */
    defaultSize?: number;
    /** Minimum width in pixels. */
    minSize?: number;
    /** Options for persisting panel size and collapsed state. */
    persistWith?: PersistOptions;
    /** Panel title for the selected record - defaults to its `name`. */
    titleFn?: (record: StoreRecord) => ReactNode;
    /**
     * Renders the form body for the selected record - typically one or more `formFieldSet`s of
     * `formField`s bound to the store's field names. Rendered within a read-only `form` bound to
     * the model's FormModel, styled with the `xh-admin-readonly-form` class.
     */
    renderForm: (record: StoreRecord, formModel: FormModel) => ReactNode;
}

/**
 * Read-only detail view of the record selected in an enclosing RestGrid, docked to its right.
 * Tracks the grid's selection, refreshes when the grid reloads, and offers an Edit button to open
 * the grid's editor dialog for the selected record.
 *
 * Render as a sibling of `restGrid()` within an `hframe`, where the RestGridModel is available
 * from context.
 */
export const restDetailPanel = hoistCmp.factory<RestDetailPanelProps>({
    displayName: 'RestDetailPanel',
    className: 'xh-admin-rest-detail',
    model: creates(RestDetailModel),

    render({model, className, icon, titleFn, renderForm, ...props}) {
        const {
                emptyText = 'Select a record to view its details.',
                defaultSize = 550,
                minSize = 400
            } = props,
            {hasSelection, readonly, record, formModel, persistWith, gridModel} = model;

        return panel({
            className,
            title: hasSelection
                ? (titleFn?.(record) ?? record.data.name)
                : `${startCase(gridModel.unit)} Detail`,
            icon,
            compactHeader: true,
            modelConfig: {side: 'right', defaultSize, minSize, persistWith},
            item: hasSelection
                ? form({
                      model: formModel,
                      fieldDefaults: {readonlyRenderer: valOrNa},
                      item: vframe({
                          className: 'xh-admin-rest-detail__form xh-admin-readonly-form',
                          items: renderForm(record, formModel)
                      })
                  })
                : placeholder(icon, emptyText),
            bbar: toolbar({
                omit: !hasSelection || readonly,
                items: [
                    filler(),
                    button({
                        text: 'Edit',
                        icon: Icon.edit(),
                        intent: 'primary',
                        outlined: true,
                        onClick: () => model.edit()
                    })
                ]
            })
        });
    }
});

/**
 * Readonly renderer for a JSON field within a {@link restDetailPanel} - a read-only JsonInput that
 * fills its container. Pair with the `xh-admin-readonly-form__fill` class on the enclosing
 * `formFieldSet` to have it take the remaining panel height.
 */
export function jsonDetailRenderer(v: any): ReactNode {
    if (v == null) return naSpan();
    return jsonInput({
        value: isString(v) ? v : JSON.stringify(v),
        readonly: true,
        autoFormat: true,
        enableSearch: true,
        flex: 1,
        width: '100%',
        height: '100%'
    });
}
