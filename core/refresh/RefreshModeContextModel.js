/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {RefreshContextModel} from '@xh/hoist/core/refresh';
import {loadAllAsync, RefreshMode} from '@xh/hoist/core';

/**
 * A refresh context model that consults a model's RefreshMode and active state to co-ordinate
 * refreshes of its target models.
 *
 * The associated model must have both:
 *  a) An observable `isActive` property, that returns a boolean value.
 *  b) A `refreshMode` property, that returns a RefreshMode enum value.
 */
@RefreshContextModel
export class RefreshModeContextModel {

    model;

    constructor(model)  {
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