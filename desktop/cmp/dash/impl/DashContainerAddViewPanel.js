/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, hoistCmp, creates, managed} from '@xh/hoist/core';
import {hbox, box, div, filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {FormModel, required, form} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {select} from '@xh/hoist/desktop/cmp/input';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

import './DashContainerAddViewPanel.scss';

/**
 * Default panel for adding views to a DashContainer. Can be replaced via
 * DashContainerModel's `addViewContent` config.
 *
 * @see DashContainerModel
 * @private
 */
export const dashContainerAddViewPanel = hoistCmp.factory({
    model: creates(() => new Model()),
    render({model, stack, dashContainerModel, popoverModel}) {
        model.stack = stack;
        model.dashContainerModel = dashContainerModel;
        model.popoverModel = popoverModel;

        const {formModel, options} = model;

        return panel({
            className: 'xh-dash-container-add-view-panel',
            items: form({
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
                    onClick: () => model.popoverModel.close()
                }),
                button({
                    disabled: !formModel.isValid,
                    text: 'Add',
                    icon: Icon.add(),
                    intent: 'success',
                    onClick: () => model.addViewAsync()
                })
            ]
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

    dashContainerModel;
    stack;
    popoverModel;

    @managed
    formModel = new FormModel({
        fields: [{
            name: 'viewSpec',
            rules: [required]
        }]
    });

    get options() {
        const {dashContainerModel} = this,
            {viewSpecs} = dashContainerModel;

        return viewSpecs.filter(viewSpec => {
            if (!viewSpec.allowAdd) return false;
            if (viewSpec.unique) {
                const instances = dashContainerModel.getItemsBySpecId(viewSpec.id);
                return !instances.length;
            }
            return true;
        }).map(viewSpec => {
            const {id, title, icon} = viewSpec;
            return {value: id, label: title, icon};
        });
    }

    constructor() {
        this.addReaction({
            track: () => this.popoverModel?.isOpen,
            run: () => this.formModel.reset()
        });
    }

    async addViewAsync() {
        await this.formModel.validateAsync();
        if (!this.formModel.isValid) return;

        const id = this.formModel.values.viewSpec;
        this.dashContainerModel.addView(id, this.stack);
        this.popoverModel.close();
    }

}
