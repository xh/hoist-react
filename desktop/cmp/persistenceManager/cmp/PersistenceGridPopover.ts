import {grid} from '@xh/hoist/cmp/grid';
import {filler, hbox} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {capitalize, isEmpty, isNull} from 'lodash';
import {button} from '../../button';
import {popover} from '@xh/hoist/kit/blueprint';
import {PersistenceManagerModel, saveButton} from '@xh/hoist/desktop/cmp/persistenceManager';

export interface PersistenceGridPopoverProps extends HoistProps<PersistenceManagerModel> {
    /** True (default) to render a save button alongside the primary menu button when dirty. */
    omitTopLevelSaveButton?: boolean;
    /** True to omit the default menu component. Should be used when creating custom app-specific component */
    omitDefaultGridComponent?: boolean;
}

export const [PersistenceGridPopover, persistenceGridPopover] =
    hoistCmp.withFactory<PersistenceGridPopoverProps>({
        displayName: 'PersistenceGridPopover',
        className: 'xh-persistence-manager__menu',
        model: uses(PersistenceManagerModel),

        render({
            model,
            omitDefaultGridComponent = false,
            omitTopLevelSaveButton = false
        }: PersistenceGridPopoverProps) {
            if (omitDefaultGridComponent) return null;
            const {selectedView, isShared, entity} = model,
                displayName = entity.displayName;
            return hbox({
                items: [
                    popover({
                        placement: 'bottom-end',
                        item: button({
                            text:
                                model.getHierarchyDisplayName(selectedView?.name) ??
                                `Default ${capitalize(displayName)}`,
                            icon: isShared ? Icon.users() : Icon.bookmark(),
                            rightIcon: Icon.chevronDown(),
                            outlined: true
                        }),
                        content: panel({
                            className: 'xh-persistence-manager',
                            compactHeader: true,
                            style: {minHeight: 100, width: 500},
                            item: grid({agOptions: {domLayout: 'autoHeight'}}),
                            bbar: bbar()
                        })
                    }),
                    saveButton({omit: omitTopLevelSaveButton || !model.canSave})
                ]
            });
        }
    });

const bbar = hoistCmp.factory<PersistenceManagerModel>({
    render({model}) {
        return toolbar(
            storeFilterField({store: model.gridModel.store}),
            filler(),
            button({
                icon: Icon.home(),
                intent: 'primary',
                omit: !model.enableDefault,
                disabled: isNull(model.selectedId),
                onClick: () => model.selectAsync(null)
            }),
            button({
                icon: Icon.gear(),
                disabled: isEmpty(model.views),
                onClick: () => model.openManageDialog()
            }),
            '-',
            button({
                tooltip: `Revert ${capitalize(model.entity.displayName)}`,
                icon: Icon.reset(),
                disabled: !model.isDirty || !model.selectedView,
                onClick: () => model.resetAsync()
            }),
            button({
                text: 'Save as...',
                icon: Icon.copy(),
                disabled: !model.selectedView,
                onClick: () => model.saveAsAsync()
            }),
            button({
                text: 'Save',
                icon: Icon.save(),
                intent: 'primary',
                disabled: !model.canSave,
                onClick: () => model.saveAsync()
            })
        );
    }
});
