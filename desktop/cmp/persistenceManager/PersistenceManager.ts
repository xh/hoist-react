import {fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import './PersistenceManager.scss';
import {button} from '@xh/hoist/desktop/cmp/button';
import {
    persistenceGridPopover,
    PersistenceGridPopoverProps
} from '@xh/hoist/desktop/cmp/persistenceManager/cmp/PersistenceGridPopover';
import {Icon} from '@xh/hoist/icon';
import {PersistenceManagerModel} from './PersistenceManagerModel';
import {manageDialog} from './cmp/ManageDialog';
import {saveDialog} from './cmp/SaveDialog';
import {persistenceMenu, PersistenceMenuProps} from './cmp/PersistenceMenu';

export interface PersistenceManagerProps extends HoistProps<PersistenceManagerModel> {
    persistenceMenu?: boolean | PersistenceMenuProps;
    persistenceGridPopover?: boolean | PersistenceGridPopoverProps;
}

export const [PersistenceManager, persistenceManager] =
    hoistCmp.withFactory<PersistenceManagerProps>({
        displayName: 'PersistenceManager',
        className: 'xh-persistence-manager',
        model: uses(PersistenceManagerModel),

        render({model, ...props}) {
            const persistenceMenuProps: PersistenceMenuProps = {},
                persistenceGridPopoverProps: PersistenceGridPopoverProps = {};
            if (props.persistenceMenu === false) {
                persistenceMenuProps.omitDefaultMenuComponent = true;
                persistenceMenuProps.omitTopLevelSaveButton = true;
            } else {
                Object.assign(persistenceMenuProps, props.persistenceMenu);
            }

            if (props.persistenceGridPopover === false) {
                persistenceGridPopoverProps.omitDefaultGridComponent = true;
                persistenceGridPopoverProps.omitTopLevelSaveButton = true;
            } else {
                Object.assign(persistenceGridPopoverProps, props.persistenceGridPopover);
            }

            return fragment(
                persistenceMenu({...persistenceMenuProps}),
                persistenceGridPopover({...persistenceGridPopoverProps}),
                manageDialog(),
                saveDialog()
            );
        }
    });

export const saveButton = hoistCmp.factory<PersistenceMenuProps>({
    render({model}) {
        return button({
            icon: Icon.save(),
            tooltip: `Save changes to this ${model.entity.displayName}`,
            intent: 'primary',
            onClick: () => model.saveAsync(false).linkTo(model.loadModel)
        });
    }
});
