import {roleGraph} from '@xh/hoist/admin/tabs/roles/inspector/graph/RoleGraph';
import {roleMembers} from '@xh/hoist/admin/tabs/roles/inspector/members/RoleMembers';
import {TabConfig, TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, HoistRole, managed, PersistOptions} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {bindable} from '@xh/hoist/mobx';
import {compact} from 'lodash';

export class RoleInspectorModel extends HoistModel {
    @managed readonly tabContainerModel: TabContainerModel;
    readonly onRoleSelected?: (role: string) => void;

    @bindable.ref role: HoistRole;

    constructor(cfg?: {onRoleSelected?: (role: string) => void; persistWith?: PersistOptions}) {
        super();
        this.persistWith = cfg?.persistWith;
        this.onRoleSelected = cfg?.onRoleSelected;
        this.tabContainerModel = this.createTabContainerModel();
    }

    selectRole(role: string) {
        this.onRoleSelected?.(role);
    }

    setTabs(tabs: Record<'inheritanceGraph' | 'members', boolean>) {
        this.tabContainerModel.setTabs(this.createTabs().filter(tab => tabs[tab.id]));
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    private createTabContainerModel(): TabContainerModel {
        return new TabContainerModel({
            persistWith: this.persistWith && {
                ...this.persistWith,
                path: compact([this.persistWith.path, 'TabContainer']).join()
            },
            tabs: this.createTabs()
        });
    }

    private createTabs(): TabConfig[] {
        return [
            {
                id: 'inheritanceGraph',
                icon: Icon.treeList(),
                content: roleGraph
            },
            {
                id: 'members',
                icon: Icon.userCheck(),
                content: roleMembers
            }
        ];
    }
}
