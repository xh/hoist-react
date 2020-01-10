/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, hoistCmp, creates, useContextModel, managed} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {hbox, box, div, filler} from '@xh/hoist/cmp/layout';
import {dialog} from '@xh/hoist/kit/blueprint';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {FormModel, required, form} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {select} from '@xh/hoist/desktop/cmp/input';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';

import './DashContainerViewDialog.scss';
import {DashContainerModel} from '../DashContainerModel';

export const dashContainerViewDialog = hoistCmp.factory({
    model: creates(() => new Model()),
    className: 'xh-dash-container-view-dialog',

    render({model, className, dashContainerModel}) {
        dashContainerModel = withDefault(dashContainerModel, useContextModel(DashContainerModel));
        model.setDashContainerModel(dashContainerModel);

        if (!model.isOpen) return null;

        const {formModel, options} = model;

        return dialog({
            icon: Icon.add(),
            title: 'Add View',
            className,
            isOpen: true,
            onClose: () => model.close(),
            item: panel({
                item: form({
                    fieldDefaults: {
                        inline: true,
                        minimal: true
                    },
                    item: formField({
                        label: null,
                        field: 'viewSpec',
                        item: select({
                            options,
                            optionRenderer: (opt) => viewSpecOption({opt}),
                            hideSelectedOptionCheck: true,
                            autoFocus: true
                        })
                    })
                }),
                bbar: [
                    filler(),
                    button({
                        text: 'Cancel',
                        modifier: 'quiet',
                        onClick: () => model.close()
                    }),
                    button({
                        disabled: !formModel.isValid,
                        text: 'Add',
                        icon: Icon.add(),
                        intent: 'success',
                        onClick: () => model.addViewAsync()
                    })
                ]
            })
        });
    }
});

const viewSpecOption = hoistCmp.factory(
    ({opt}) => hbox({
        items: [
            box({
                item: opt.icon,
                width: 32,
                paddingLeft: 8
            }),
            div(opt.label)
        ],
        alignItems: 'center'
    })
);

@HoistModel
class Model {

    @bindable.ref dashContainerModel;

    @managed
    formModel = new FormModel({
        fields: [{
            name: 'viewSpec',
            rules: [required]
        }]
    });

    get isOpen() {
        return this.dashContainerModel?.dialogIsOpen;
    }

    get options() {
        const {dashContainerModel} = this,
            {viewSpecs} = dashContainerModel;

        return viewSpecs.filter(viewSpec => {
            const instances = dashContainerModel.getViewsBySpecId(viewSpec.id);
            return !viewSpec.unique || !instances.length;
        }).map(viewSpec => {
            const {id, title, icon} = viewSpec;
            return {value: id, label: title, icon};
        });
    }

    constructor() {
        this.addReaction({
            track: () => this.isOpen,
            run: () => this.formModel.reset()
        });
    }

    async addViewAsync() {
        await this.formModel.validateAsync();
        if (!this.formModel.isValid) return;

        const {viewSpec} = this.formModel.values;
        this.dashContainerModel.submitViewDialog(viewSpec);
        this.close();
    }

    close() {
        this.dashContainerModel.closeViewDialog();
    }

}
