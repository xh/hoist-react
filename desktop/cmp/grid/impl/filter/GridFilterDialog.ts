/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {form, FormModel} from '@xh/hoist/cmp/form';
import {GridFilterModel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, lookup, managed, useLocalModel, uses} from '@xh/hoist/core';
import {parseFilter, required, withFilterByTypes} from '@xh/hoist/data';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {every} from 'lodash';

import './GridFilterDialog.scss';

/**
 * Dialog for showing a read-only JSON representation of the currently applied grid filters.
 *
 * Applications should not create this component - it is created automatically for Grids with
 * a GridFilterModel, and is available via the `gridFilter` action.
 *
 * @internal
 */
export const gridFilterDialog = hoistCmp.factory({
    model: uses(GridFilterModel),
    className: 'xh-grid-filter-dialog',

    render({model, className}) {
        const impl = useLocalModel(GridFilterDialogLocalModel);
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

const filterForm = hoistCmp.factory(({impl}) => {
    return form({
        model: impl.formModel,
        fieldDefaults: {label: null, minimal: true},
        item: formField({
            field: 'filter',
            item: jsonInput()
        })
    });
});

const bbar = hoistCmp.factory(({impl}) => {
    const {isValid, isDirty} = impl.formModel;
    return toolbar(
        button({
            icon: Icon.delete(),
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
});

class GridFilterDialogLocalModel extends HoistModel {
    override xhImpl = true;

    @lookup(GridFilterModel) model: GridFilterModel;

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

    override onLinked() {
        this.addReaction({
            track: () => this.model.dialogOpen,
            run: open => {
                if (open) this.loadForm();
            }
        });
    }

    async saveAsync() {
        const {model, formModel} = this,
            valid = await formModel.validateAsync();
        if (!valid) return;

        const newFilter = JSON.parse(formModel.values.filter),
            filter = withFilterByTypes(model.filter, newFilter, ['FieldFilter', 'CompoundFilter']);

        model.setFilter(filter);
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
        const filter = withFilterByTypes(this.model.filter, null, 'FunctionFilter');
        this.formModel.init({
            filter: JSON.stringify(filter?.toJSON() ?? null, undefined, 2)
        });
    }

    validateFilter(filter) {
        if (filter?.filters) return every(filter.filters, it => this.validateFilter(it));
        return !!parseFilter(filter);
    }
}
