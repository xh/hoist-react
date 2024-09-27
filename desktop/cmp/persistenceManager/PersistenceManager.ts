import {fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import './PersistenceManager.scss';
import {manageDialog, saveDialog, persistenceMenu} from '@xh/hoist/desktop/cmp/persistenceManager';
import {PersistenceManagerModel} from '@xh/hoist/core/persist/persistenceManager';

export interface PersistenceManagerProps extends HoistProps<PersistenceManagerModel> {}

export const [PersistenceManager, persistenceManager] =
    hoistCmp.withFactory<PersistenceManagerProps>({
        displayName: 'PersistenceManager',
        className: 'xh-persistence-manager',
        model: uses(PersistenceManagerModel),

        render() {
            return fragment(
                persistenceMenu({
                    showPrivateViewsInSubMenu: false,
                    showSharedViewsInSubMenu: true,
                    showSaveButton: 'always'
                }),
                manageDialog(),
                saveDialog()
            );
        }
    });
