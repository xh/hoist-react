/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {valOrNa} from '@xh/hoist/admin/AdminUtils';
import {form, FormModel} from '@xh/hoist/cmp/form';
import {filler, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, HoistProps, PersistOptions} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {startCase} from 'lodash';
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
 * Read-only detail view of the record selected in a RestGrid, docked to its right. Tracks the
 * grid's selection, refreshes when the grid reloads, and offers an Edit button to open the grid's
 * editor dialog for the selected record.
 *
 * Render as a sibling of `restGrid()` within an `hframe`. The host RestGridModel is resolved via
 * `@lookup`, so the model of an enclosing component must expose it as a public property.
 */
export const restDetailPanel = hoistCmp.factory<RestDetailPanelProps>({
    displayName: 'RestDetailPanel',
    className: 'xh-admin-rest-detail',
    model: creates(RestDetailModel),

    render({model, className, icon, titleFn, renderForm, ...props}) {
        const {
                emptyText = 'Select a record to view its details.',
                defaultSize = 550,
                minSize = 400,
                persistWith
            } = props,
            {hasSelection, readonly, record, formModel, gridModel} = model;

        return panel({
            className,
            title: hasSelection
                ? (titleFn?.(record) ?? record.data.name)
                : `${startCase(gridModel.unit)} Detail`,
            icon,
            compactHeader: true,
            modelConfig: {
                side: 'right',
                defaultSize,
                minSize,
                persistWith,
                // Skip per-selection form work while collapsed.
                renderMode: 'unmountOnHide'
            },
            item: hasSelection
                ? form({
                      model: formModel,
                      fieldDefaults: {readonlyRenderer: valOrNa},
                      item: vframe({
                          className: 'xh-admin-rest-detail__form xh-admin-readonly-form',
                          // Scroll when content outgrows the panel - inline to beat the frame's
                          // own overflow: hidden.
                          overflowY: 'auto',
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
