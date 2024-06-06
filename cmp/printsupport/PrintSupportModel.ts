/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {ColDef, ColGroupDef, ManagedGridOptions} from '@ag-grid-community/core';
import {DomLayoutType} from '@ag-grid-community/core/dist/types/src/entities/gridOptions';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {isEmpty} from 'lodash';

import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, TrackOptions, XH} from '@xh/hoist/core';
import {makeObservable, bindable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';

export interface PrintSupportConfig {
    /* True to enable tracking of print activity (default false). */
    track?: boolean;

    /**
     * Delay in milliseconds before printing (default 2000).
     * Ag-Grid needs time to render the print view before calling window.print().
     * Very complex UIs or grids may need longer.
     * No need to set to less than 2000. A 2000 delay is not noticeable to the user.
     **/
    delay?: number;
}

export interface PrintSupportGridConfig extends PrintSupportConfig {
    /* True to show print action columns (default false). */
    showActions?: boolean;

    /**
     *  Maximum width of flex columns in the grid when printing (default 250).
     *  Without a max width, flex columns can expand to fill the page width.
     **/
    flexMaxWidth?: number;
}

export interface PrintSupportPanelConfig extends PrintSupportConfig {
    hideHeaderItems?: boolean; // todo
    hideToolbars?: boolean; // todo
    printTarget?: string; // todo - selector for print target or only print '.printTarget' class if present
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
    delay: number;

    inlineRef = createObservableRef<HTMLElement>();
    printRef = createObservableRef<HTMLElement>();
    hostNode: HTMLElement;

    // store grid and app state before printing
    gridDomLayout: DomLayoutType;
    gridColumnDefs: (ColDef | ColGroupDef)[] = [];
    toggledTheme: boolean;

    toggleIsPrinting() {
        this.isPrinting = !this.isPrinting;
    }

    constructor(
        parentModel: HoistModel,
        {
            showActions = false,
            flexMaxWidth = 250,
            track = false,
            delay = 2000
        }: PrintSupportGridConfig = {}
    ) {
        super();
        makeObservable(this);

        this.parentModel = parentModel;
        this.showActions = showActions;
        this.flexMaxWidth = flexMaxWidth;
        this.track = track;
        this.delay = delay;

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

        if (this.parentModel instanceof GridModel) {
            this.setupForPrintingGrid(this.parentModel);
        } else if (this.parentModel instanceof PanelModel) {
            this.setupForPrintingPanel();
        }

        // for all component types, allow scrolling and hide the root app node
        this.setStyles('.xh-app', {overflow: 'auto'});
        this.setStyles('#xh-root', {display: 'none'});
        window.dispatchEvent(new Event('resize'));
    }

    private toScreenMode() {
        if (this.toggledTheme) {
            XH.toggleTheme();
        }

        // special handling for grids
        if (this.parentModel instanceof GridModel) {
            this.setupGridForScreen(this.parentModel);
        }

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

    // //////////////////////
    // Panel-specific logic
    // //////////////////////
    private setupForPrintingPanel() {
        const trackOptions = (
            this.track
                ? {
                      category: 'Print',
                      message: `Printed Panel`,
                      data: {
                          uri: XH.routerState.path
                      }
                  }
                : {omit: true}
        ) as TrackOptions;

        XH.track(trackOptions);

        setTimeout(
            () => {
                window.print();
                // Setting print mode to false right after print dialog opens
                // does not affect print dialog, and does not change
                // the underlying UI until the print dialog is closed.
                this.isPrinting = false;
            },
            // No need for delay for printing panels
            // But there is a need to wait for next tick for print styles to be applied
            0
        );
    }

    // //////////////////////
    // Grid-specific logic
    // //////////////////////
    private setupForPrintingGrid(gridModel: GridModel) {
        const {agApi} = gridModel;
        throwIf(!agApi, 'ag-Grid API not available for printing.');

        this.gridDomLayout = agApi.getGridOption('domLayout');
        this.gridColumnDefs = agApi.getColumnDefs();
        let printableColumns = this.gridColumnDefs;

        // only change the grid if it is not already in print mode
        if (this.gridDomLayout !== 'print') {
            printableColumns = this.adjustColumnDefsForPrint(this.gridColumnDefs);
            agApi.updateGridOptions({
                domLayout: 'print',
                columnDefs: printableColumns
            });
        }

        const trackOptions = (
            this.track
                ? {
                      category: 'Print',
                      message: `Printed Grid`,
                      data: {
                          rows: agApi.getRenderedNodes().length,
                          columns: printableColumns.length,
                          uri: XH.routerState.path
                      }
                  }
                : {omit: true}
        ) as TrackOptions;

        XH.track(trackOptions);

        setTimeout(
            () => {
                window.print();
                // Setting print mode to false right after print dialog opens
                // does not affect print dialog, and does not change
                // the underlying UI until the print dialog is closed.
                this.isPrinting = false;
            },
            // Delay needed for ag-grid to render the print view before calling window.print()
            2000
        );
    }

    private setupGridForScreen(gridModel: GridModel) {
        const {agApi} = gridModel;
        if (!agApi) return;

        const gridDomLayout = agApi.getGridOption('domLayout'),
            gridOptions: ManagedGridOptions = {};

        if (gridDomLayout === 'print') {
            gridOptions['domLayout'] = this.gridDomLayout ?? 'normal'; // ag-grid default
            gridOptions['columnDefs'] = this.adjustColumnDefsForScreen(this.gridColumnDefs);
        }

        if (!isEmpty(gridOptions)) gridModel.agApi.updateGridOptions(gridOptions);

        this.gridDomLayout = undefined;
        this.gridColumnDefs = [];
    }

    private adjustColumnDefsForPrint(columnDefs: (ColDef | ColGroupDef)[]) {
        const ret = columnDefs.map(def => {
            if (isColGroupDef(def)) {
                return {
                    ...def,
                    children: this.adjustColumnDefsForPrint(def.children)
                };
            }

            const ret: ColDef = {...def};
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

            // Reset any changes made for print (currently only actions column).
            const ret: ColDef = {...def};

            // If hide is not set, ag-grid will not render the column
            // if hide was set to true for print mode,
            // so we need to set it to false explicitly,
            // to make it visible again.
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
