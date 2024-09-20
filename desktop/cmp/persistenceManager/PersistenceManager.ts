import {fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import './PersistenceManager.scss';
import {PersistenceManagerModel} from './PersistenceManagerModel';
import {manageDialog} from './cmp/ManageDialog';
import {saveDialog} from './cmp/SaveDialog';
import {persistenceMenu, PersistenceMenuProps} from './cmp/PersistenceMenu';

export interface PersistenceManagerProps extends HoistProps<PersistenceManagerModel> {
    persistenceMenu: boolean | PersistenceMenuProps;
}

export const [PersistenceManager, persistenceManager] =
    hoistCmp.withFactory<PersistenceManagerProps>({
        displayName: 'PersistenceManager',
        className: 'xh-persistence-manager',
        model: uses(PersistenceManagerModel),

        render({model, ...props}) {
            const persistenceMenuProps: PersistenceMenuProps = {};
            if (props.persistenceMenu === false) {
                persistenceMenuProps.omitDefaultMenuComponent = true;
                persistenceMenuProps.omitTopLevelSaveButton = false;
            } else {
                Object.assign(persistenceMenuProps, props.persistenceMenu);
            }
            return fragment(
                persistenceMenu({...persistenceMenuProps}),
                manageDialog(),
                saveDialog()
            );
        }
    });
