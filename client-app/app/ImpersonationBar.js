/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {identityService, elemFactory} from 'hoist';
import {hbox, vbox, spacer, filler, div, span} from 'hoist/layout';
import {Classes, HotkeysTarget, button, suggest, icon, popover, menuItem, hotkeys, hotkey} from 'hoist/kit/blueprint';
import {observer} from 'hoist/mobx';
import {hoistAppModel} from 'hoist/app/HoistAppModel';

import {ImpersonationBarModel} from './ImpersonationBarModel';

@HotkeysTarget
@observer
export class ImpersonationBar extends Component {

    model = new ImpersonationBarModel();

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

        const {impersonating, username} = identityService;
        return hbox({
            flex: 'none',
            padding: 5,
            style: {
                color: 'white',
                backgroundColor: 'midnightblue'
            },
            alignItems: 'center',
            items: [
                icon({icon: 'person'}),
                spacer({width: 10}),
                div(`${impersonating ? 'Impersonating' : ''} ${username}`),
                filler(),
                this.switchButton(),
                spacer({width: 4}),
                this.exitButton()
            ]
        });
    }

    switchButton() {
        const model = this.model;

        return popover({
            target: button({
                text: 'Switch User',
                icon: 'random',
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
                        button({text: 'Close', onClick: this.onCloseClick}),
                        spacer({width: 5}),
                        button({text: 'OK', onClick: this.onOKClick, disabled: !model.selectedTarget})
                    )
                ]
            })
        });
    }

    exitButton() {
        const text = identityService.impersonating ? 'Exit Impersonation' : 'Close';
        return button({text, icon: 'cross', onClick: this.onExitClick});
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