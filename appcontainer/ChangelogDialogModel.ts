/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

export class ChangelogDialogModel extends HoistModel {
    override xhImpl = true;

    @observable accessor isOpen: boolean = false;

    init() {
        this.addReaction({
            track: () => XH.routerState,
            run: () => this.hide()
        });
    }

    @action
    show() {
        throwIf(!XH.changelogService.enabled, 'ChangelogService not enabled.');
        this.isOpen = true;
        XH.changelogService.markLatestAsRead();
        XH.track({category: 'Navigation', message: 'Opened Changelog'});
    }

    @action
    hide() {
        this.isOpen = false;
    }
}
