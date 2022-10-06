/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {loadAllAsync, RefreshContextModel, RefreshMode} from '@xh/hoist/core';

/**
 * A refresh context model that consults a model's RefreshMode and active state to manage
 * refreshes of its target models.
 *
 * The associated model must have both:
 *  a) An observable `isActive` property, that returns a boolean value.
 *  b) A `refreshMode` property, that returns a RefreshMode enum value.
 */
export class ManagedRefreshContextModel extends RefreshContextModel {
    xhImpl = true;

    model;

    constructor(model)  {
        super();
        this.model = model;
        this.addReaction({
            track: () => model.isActive,
            run: this.noteActiveChanged
        });
    }

    async doLoadAsync(loadSpec) {
        const {model} = this,
            mode = model.refreshMode;

        if (model.isActive || mode === RefreshMode.ALWAYS) {
            return await loadAllAsync(this.refreshTargets, loadSpec);
        }

        if (mode === RefreshMode.ON_SHOW_LAZY) {
            this.refreshPending = true;
        }
    }

    noteActiveChanged(isActive) {
        if (isActive) {
            const mode = this.model.refreshMode;
            if (mode === RefreshMode.ON_SHOW_ALWAYS) {
                this.refreshAsync();
            } else if (mode === RefreshMode.ON_SHOW_LAZY && this.refreshPending) {
                this.refreshPending = false;
                this.refreshAsync();
            }
        }
    }
}
