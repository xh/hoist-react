/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {DashCanvasModel, DashCanvasViewSpec} from '@xh/hoist/desktop/cmp/dash';
import {makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {DragEvent} from 'react';

export class DashCanvasWidgetChooserModel extends HoistModel {
    @observable.ref
    dashCanvasModel: DashCanvasModel;

    private _savedShowAddViewButtonWhenEmpty: boolean;

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.componentProps,
            run: () =>
                runInAction(() => (this.dashCanvasModel = this.componentProps.dashCanvasModel)),
            fireImmediately: true
        });
    }

    onDragStart(evt: DragEvent<HTMLDivElement>, viewSpec: DashCanvasViewSpec) {
        if (!viewSpec) return;

        this._savedShowAddViewButtonWhenEmpty = this.dashCanvasModel.showAddViewButtonWhenEmpty;
        this.dashCanvasModel.showAddViewButtonWhenEmpty = false;
        evt.dataTransfer.effectAllowed = 'move';
        (evt.target as HTMLElement).classList.add('is-dragging');

        const {width, height} = viewSpec,
            widget = {
                viewSpecId: viewSpec.id,
                layout: {
                    x: 0,
                    y: 0,
                    w: width,
                    h: height
                }
            };

        this.dashCanvasModel.setDraggedInView(widget);
    }

    onDragEnd(evt: DragEvent<HTMLDivElement>) {
        this.dashCanvasModel.showAddViewButtonWhenEmpty =
            this._savedShowAddViewButtonWhenEmpty ?? true;

        const target = evt.target as HTMLElement;
        if (!target) return;

        target.classList.remove('is-dragging');
    }
}
