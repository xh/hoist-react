/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses, HoistModel, useLocalModel, managed} from '@xh/hoist/core';
import {GridFilterModel} from '@xh/hoist/cmp/grid/filter/GridFilterModel';
import {required, parseFilter} from '@xh/hoist/data';
import {filler} from '@xh/hoist/cmp/layout';
import {dialog} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {FormModel, form} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {every} from 'lodash';

import './GridFilterDialog.scss';

/**
 * Dialog for showing a read-only JSON representation of the currently applied grid filters.
 *
 * Applications should not create this component - it is created automatically for Grids with
 * a GridFilterModel, and is available via the `gridFilter` StoreContextMenu action.
 *
 * @private
 */
export const gridFilterDialog = hoistCmp.factory({
    model: uses(GridFilterModel),
    className: 'xh-grid-filter-dialog',
    render({model, className}) {
        const impl = useLocalModel(() => new LocalModel(model));
        if (!model.dialogOpen) return null;
        return dialog({
            className,
            icon: Icon.code(),
            title: 'Grid Filters',
            isOpen: true,
            onClose: () => impl.close(),
            item: panel({
                item: filterForm({impl}),
                bbar: bbar({impl})
            })
        });
    }
});

const filterForm = hoistCmp.factory(
    ({impl}) => {
        return form({
            model: impl.formModel,
            fieldDefaults: {label: null, minimal: true},
            item: formField({
                field: 'filter',
                item: jsonInput()
            })
        });
    }
);

const bbar = hoistCmp.factory(
    ({impl}) => {
        const {isValid, isDirty} = impl.formModel;
        return toolbar(
            button({
                icon: Icon.reset(),
                intent: 'danger',
                text: 'Clear Filter',
                onClick: () => impl.clear()
            }),
            filler(),
            button({
                text: 'Save',
                icon: Icon.check(),
                intent: 'success',
                disabled: !isValid || !isDirty,
                onClick: () => impl.saveAsync()
            }),
            button({
                text: 'Cancel',
                onClick: () => impl.close()
            })
        );
    }
);

class LocalModel extends HoistModel {

    /** @member {GridFilterModel} */
    model;

    /** @member {FormModel} */
    @managed
    formModel = new FormModel({
        fields: [
            {
                name: 'filter',
                rules: [
                    required,
                    ({value}) => {
                        try {
                            const filter = JSON.parse(value);
                            try {
                                const valid = this.validateFilter(filter);
                                if (!valid) return 'Filter spec is invalid';
                            } catch (e) {
                                return e.message;
                            }
                        } catch {
                            return 'Filter spec is not valid JSON';
                        }
                    }
                ]
            }
        ]
    });

    constructor(model) {
        super();
        this.model = model;

        this.addReaction({
            track: () => model.dialogOpen,
            run: (open) => {
                if (open) this.loadForm();
            }
        });
    }

    async saveAsync() {
        const valid = await this.formModel.validateAsync();
        if (!valid) return;

        const filter = JSON.parse(this.formModel.values.filter);
        this.model.setFilter(filter);
        this.close();
    }

    clear() {
        this.model.clear();
        this.close();
    }

    close() {
        this.model.closeDialog();
    }

    loadForm() {
        const filter = JSON.stringify(this.model.filter?.toJSON() ?? null, undefined, 2);
        this.formModel.init({filter});
    }

    validateFilter(filter) {
        if (filter?.filters) return every(filter.filters, it => this.validateFilter(it));
        return !!parseFilter(filter);
    }
}