/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, hoistComponent} from 'hoist/core';
import {hbox, vbox, spacer, filler, div, span} from 'hoist/layout';
import {Classes, button, suggest, popover, menuItem, hotkeys, hotkey} from 'hoist/kit/blueprint';
import {Icon} from 'hoist/icon';

import {ImpersonationBarModel} from './ImpersonationBarModel';

@hoistComponent()
export class ImpersonationBar extends Component {

    localModel = new ImpersonationBarModel();

    renderHotkeys() {
        return hotkeys(
            hotkey({
                global: true,
                combo: 'ctrl + i',
                label: 'Open Impersonation Dialog',
                onKeyDown: this.onHotKey
            })
        );
    }

    render() {
        if (!this.model.isVisible) return span();  // *Not* null, so hotkeys get rendered.

        const {impersonating, username} = XH.identityService;
        return hbox({
            flex: 'none',
            cls: 'xh-tbar',
            style: {
                color: 'white',
                backgroundColor: 'midnightblue'
            },
            alignItems: 'center',
            items: [
                Icon.user({cls: 'xh-mr'}),
                div(`${impersonating ? 'Impersonating' : ''} ${username}`),
                filler(),
                this.switchButton(),
                this.exitButton()
            ]
        });
    }

    switchButton() {
        const model = this.model;

        return popover({
            target: button({
                text: 'Switch User',
                cls: 'xh-mr',
                style: {minWidth: 130},
                onClick: model.openTargetDialog
            }),
            isOpen: model.targetDialogOpen,
            hasBackdrop: true,
            minimal: true,
            placement: 'bottom-end',
            popoverClassName: 'pt-popover-content-sizing',
            backdropProps: {style: {backgroundColor: 'rgba(255,255,255,0.5)'}},
            content: vbox({
                justifyContent: 'right',
                items: [
                    suggest({
                        popoverProps: {popoverClassName: Classes.MINIMAL},
                        itemPredicate: (q, v, index) => !v || v.includes(q),
                        $items: model.targets || [],
                        onItemSelect: this.onItemSelect,
                        itemRenderer: (item, itemProps) => {
                            return menuItem({key: item, text: item, onClick: itemProps.handleClick});
                        },
                        inputValueRenderer: s => s
                    }),
                    spacer({height: 5}),
                    hbox(
                        filler(),
                        button({
                            text: 'Close',
                            cls: 'xh-mr',
                            onClick: this.onCloseClick
                        }),
                        button({
                            text: 'OK',
                            onClick: this.onOKClick,
                            disabled: !model.selectedTarget
                        })
                    )
                ]
            })
        });
    }

    exitButton() {
        const text = XH.identityService.impersonating ? 'Exit Impersonation' : 'Close';
        return button({text, icon: Icon.cross(), onClick: this.onExitClick});
    }

    //---------------------
    // Implementation
    //---------------------
    onHotKey = () => {
        this.model.toggleVisibility();
    }

    onItemSelect = (item) => {
        this.model.setSelectedTarget(item);
    }

    onOKClick = () => {
        this.model.doImpersonate();
    }

    onSwitchClick = () => {
        this.model.openTargetDialog();
    }

    onCloseClick = () => {
        this.model.closeTargetDialog();
    }

    onExitClick = () => {
        this.model.doExit();
    }
}
export const impersonationBar = elemFactory(ImpersonationBar);