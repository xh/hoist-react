/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {loadAllAsync, Loadable, LoadSpec} from '../load';
import {RefreshContextModel} from './';
import {RefreshMode} from '../';

export type ManagedRefreshTarget = Loadable & {isActive: boolean; refreshMode: RefreshMode};
/**
 * A refresh context model that consults a model's RefreshMode and active state to manage
 * refreshes of its target models.
 *
 * The associated Loadable must have both:
 *  a) An observable `isActive` property, that returns a boolean value.
 *  b) A `refreshMode` property, that returns a RefreshMode enum value.
 */
export class ManagedRefreshContextModel extends RefreshContextModel {
    override xhImpl = true;

    model: ManagedRefreshTarget;
    refreshPending: boolean = false;

    constructor(model: ManagedRefreshTarget) {
        super();
        this.model = model;
        this.addReaction({
            track: () => model.isActive,
            run: this.noteActiveChanged
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {model} = this,
            mode = model.refreshMode;

        if (model.isActive || mode === 'always') {
            await loadAllAsync(this.refreshTargets, loadSpec);
            return;
        }

        if (mode === 'onShowLazy') {
            this.refreshPending = true;
        }
    }

    noteActiveChanged(isActive: boolean) {
        if (isActive) {
            const mode = this.model.refreshMode;
            if (mode === 'onShowAlways') {
                this.refreshAsync();
            } else if (mode === 'onShowLazy' && this.refreshPending) {
                this.refreshPending = false;
                this.refreshAsync();
            }
        }
    }
}
