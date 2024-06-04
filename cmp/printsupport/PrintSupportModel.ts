/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {ColDef, ColGroupDef} from '@ag-grid-community/core';
import {DomLayoutType} from '@ag-grid-community/core/dist/types/src/entities/gridOptions';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, TrackOptions, XH} from '@xh/hoist/core';
import {makeObservable, bindable} from '@xh/hoist/mobx';
import {warnIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';

export interface PrintSupportConfig {
    showActions?: boolean;
    flexMaxWidth?: number;
    track?: boolean;
}

/**
 * Core Model for a PrintSupport component.
 * This model will place its component's child in 1 of 2 managed DOM nodes (either modal or inline)
 */
export class PrintSupportModel extends HoistModel {
    override xhImpl = true;

    private PRINTING_CN = 'xh-print-support__printing';

    parentModel: HoistModel;

    @bindable
    isPrinting: boolean = false;

    showActions: boolean;
    flexMaxWidth: number;
    track: boolean;

    inlineRef = createObservableRef<HTMLElement>();
    printRef = createObservableRef<HTMLElement>();
    hostNode: HTMLElement;

    // store grid and app state before printing
    gridDomLayout: DomLayoutType;
    gridColumnDefs: (ColDef | ColGroupDef)[] = [];
    toggledTheme: boolean;

    toggleIsPrinting() {
        // can only print grids, as of now
        if (!(this.parentModel instanceof GridModel)) {
            warnIf(true, 'PrintSupportModel: Only GridModel is supported for printing.');
            this.isPrinting = false;
            return;
        }
        this.isPrinting = !this.isPrinting;
    }

    constructor(
        parentModel: HoistModel,
        {showActions = false, flexMaxWidth = 250, track = false}: PrintSupportConfig = {}
    ) {
        super();
        makeObservable(this);
        this.parentModel = parentModel;
        this.showActions = showActions;
        this.flexMaxWidth = flexMaxWidth;
        this.track = track;

        this.createPrintNode();
        this.hostNode = this.createHostNode();

        this.addReaction({
            track: () => [this.inlineRef.current, this.printRef.current, this.isPrinting],
            run: () => {
                if (this.isPrinting) {
                    try {
                        this.toPrintMode();
                    } catch (e) {
                        XH.handleException(e, {
                            title: 'Error Printing',
                            message:
                                'An error occurred while printing.  Please contact support for assistance if this issue persists.',
                            alertType: 'toast'
                        });
                        this.isPrinting = false;
                    }
                } else {
                    this.toScreenMode();
                }
            }
        });
    }

    private toPrintMode() {
        // always print in light theme
        if (XH.darkTheme) {
            this.toggledTheme = true;
            XH.toggleTheme();
        }

        // move the host node to the print node
        this.printNode?.appendChild(this.hostNode);

        // special handling for grids
        if (this.parentModel instanceof GridModel) {
            this.doPrintGrid(this.parentModel);
        }

        // for all component types, allow scrolling and hide the root app node
        this.setStyles('.xh-app', {overflow: 'auto'});
        this.setStyles('#xh-root', {display: 'none'});
        window.dispatchEvent(new Event('resize'));
    }

    private doPrintGrid(gridModel: GridModel) {
        this.gridDomLayout = gridModel.agApi.getGridOption('domLayout');
        this.gridColumnDefs = gridModel.agApi.getColumnDefs();

        const printableColumns = this.adjustColumnDefsForPrint(this.gridColumnDefs);

        gridModel.agApi.updateGridOptions({
            domLayout: 'print',
            columnDefs: printableColumns
        });

        const trackOptions = (
            this.track
                ? {
                      category: 'Print',
                      message: `Printed Grid`,
                      data: {
                          rows: gridModel.agApi.getRenderedNodes().length,
                          columns: printableColumns.length
                      }
                  }
                : {omit: true}
        ) as TrackOptions;

        XH.track(trackOptions);

        setTimeout(() => {
            window.print();
            this.isPrinting = false;
        }, 2000);
    }

    private toScreenMode() {
        if (this.toggledTheme) {
            XH.toggleTheme();
        }
        if (this.parentModel instanceof GridModel && this.gridDomLayout) {
            this.parentModel.agApi.updateGridOptions({
                domLayout: this.gridDomLayout,
                columnDefs: this.adjustColumnDefsForScreen(this.gridColumnDefs)
            });
        }
        this.gridColumnDefs = [];
        this.setStyles('.xh-app', {overflow: 'visible'});
        this.setStyles('#xh-root', {display: 'block'});
        this.inlineRef.current.appendChild(this.hostNode);
        window.dispatchEvent(new Event('resize'));
    }

    /**
     * @returns Empty div set to inherit all styling from its parent
     */
    private createHostNode(): HTMLElement {
        const hostNode = document.createElement('div');
        hostNode.style.all = 'inherit';
        hostNode.classList.add('xh-print-support__host');
        return hostNode;
    }

    private createPrintNode(): HTMLElement {
        if (this.printNode) return;

        const printNode = document.createElement('div');
        printNode.classList.add(this.PRINTING_CN);
        document.body.appendChild(printNode);
    }

    private get printNode() {
        return document.querySelector('.' + this.PRINTING_CN);
    }

    private setStyles(selector: string, styles: Record<string, string>) {
        const el: HTMLElement = document.querySelector(selector);
        if (el) {
            Object.entries(styles).forEach(([key, value]) => {
                el.style[key] = value;
            });
        }
    }

    private adjustColumnDefsForPrint(columnDefs: (ColDef | ColGroupDef)[]) {
        const ret = columnDefs.map(def => {
            if (isColGroupDef(def)) {
                return {
                    ...def,
                    children: this.adjustColumnDefsForPrint(def.children)
                };
            }

            const ret: ColDef | ColGroupDef = {...def};
            if (ret.flex) {
                ret.maxWidth = this.flexMaxWidth;
            }
            if (ret.colId === 'actions' && !this.showActions) {
                ret.hide = true;
            }

            return ret;
        });
        return ret;
    }

    private adjustColumnDefsForScreen(columnDefs: (ColDef | ColGroupDef)[]) {
        const ret = columnDefs.map(def => {
            if (isColGroupDef(def)) {
                return {
                    ...def,
                    children: this.adjustColumnDefsForScreen(def.children)
                };
            }

            const ret: ColDef | ColGroupDef = {...def};
            if (ret.colId === 'actions') {
                ret.hide = ret.hide ?? false;
            }

            return ret;
        });
        return ret;
    }

    override destroy() {
        this.hostNode.remove();
        this.printNode?.remove();
        super.destroy();
    }
}

function isColGroupDef(def: ColDef | ColGroupDef): def is ColGroupDef {
    return (<ColGroupDef>def).children !== undefined;
}
