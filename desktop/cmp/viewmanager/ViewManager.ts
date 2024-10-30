import {fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import './ViewManager.scss';
import {ViewManagerModel} from '@xh/hoist/core/persist/viewmanager/ViewManagerModel';
import {manageDialog} from '@xh/hoist/desktop/cmp/viewmanager/cmp/ManageDialog';
import {saveDialog} from '@xh/hoist/desktop/cmp/viewmanager/cmp/SaveDialog';
import {viewMenu, ViewMenuProps} from './cmp/ViewMenu';

export interface ViewManagerProps extends HoistProps<ViewManagerModel> {
    viewMenuProps: ViewMenuProps;
}

export const [ViewManager, viewManager] = hoistCmp.withFactory<ViewManagerProps>({
    displayName: 'ViewManager',
    className: 'xh-view-manager',
    model: uses(ViewManagerModel),

    render({model, viewMenuProps}) {
        return fragment(
            viewMenu(viewMenuProps),
            manageDialog({
                omit: !model.isManageDialogVisible,
                onClose: () => model.closeManageDialog()
            }),
            saveDialog()
        );
    }
});
