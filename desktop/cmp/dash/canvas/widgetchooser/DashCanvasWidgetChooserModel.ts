/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {DragEvent} from 'react';
import {DashCanvasModel} from '@xh/hoist/desktop/cmp/dash';
import {HoistModel, managed} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {makeObservable, observable} from '@xh/hoist/mobx';
import {runInAction} from 'mobx';

export class DashCanvasWidgetChooserModel extends HoistModel {
    @managed
    @observable.ref
    dashCanvasModel: DashCanvasModel;

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

    onDragStart(evt: DragEvent<HTMLDivElement>) {
        const target = evt.target as HTMLElement;
        if (!target) return;

        this.dashCanvasModel.showAddViewButtonWhenEmpty = false;
        evt.dataTransfer.effectAllowed = 'move';
        target.classList.add('is-dragging');

        const viewSpecId: string = target.getAttribute('id').split('draggableFor-')[1],
            viewSpec = this.dashCanvasModel.viewSpecs.find(it => it.id === viewSpecId),
            {width, height} = viewSpec,
            widget = {
                viewSpecId,
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
        this.dashCanvasModel.showAddViewButtonWhenEmpty = true;

        const target = evt.target as HTMLElement;
        if (!target) return;

        target.classList.remove('is-dragging');
    }
}
