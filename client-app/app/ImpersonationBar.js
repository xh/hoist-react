/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {identityService} from 'hoist';
import {hbox, vbox, spacer, filler, div} from 'hoist/layout';
import {Classes, button, suggest, icon, popover, menuItem} from 'hoist/kit/blueprint';

import {icon as semanticIcon, button as semanticButton, popup, dropdown} from 'hoist/kit/semantic';
import {observer} from 'hoist/mobx';

import {ImpersonationBarStore} from './ImpersonationBarStore';

@observer
export class ImpersonationBar extends Component {

    store = new ImpersonationBarStore();

    constructor() {
        super();
        document.addEventListener('keydown', this.onKeyDown);
    }

    render() {
        if (!this.store.isVisible) return null;
        return this.blueprint.render();
    }

    onKeyDown = (e) => {
        if (e.ctrlKey && e.key === 'i') {
            this.store.toggleVisibility();
            e.stopPropagation();
        }
    }

    //---------------------
    // Blueprint
    //---------------------
    blueprint = {
        store: this.store,

        render() {
            const {impersonating, username} = identityService;
            return hbox({
                padding: 5,
                style: {
                    color: 'white',
                    backgroundColor: 'midnightblue'
                },
                alignItems: 'center',
                items: [
                    icon({iconName: 'person'}),
                    spacer({width: 10}),
                    div(`${impersonating ? 'Impersonating' : ''} ${username}`),
                    filler(),
                    this.switchButton(),
                    spacer({width: 4}),
                    this.exitButton()
                ]
            });
        },

        switchButton() {
            const store = this.store;

            return popover({
                target: button({
                    text: 'Switch User',
                    iconName: 'random',
                    style: {minWidth: 130},
                    onClick: store.openTargetDialog
                }),
                isOpen: store.targetDialogOpen,
                hasBackdrop: true,
                minimal: true,
                placement: 'bottom-end',
                popoverClassName: 'pt-popover-content-sizing',
                backdropProps: {style: {backgroundColor: 'rgba(255,255,255,0.5)'}},
                onClose: store.closeTargetDialog,
                content: vbox({
                    justifyContent: 'right',
                    items: [
                        suggest({
                            inputProps: {value: store.selectedTarget},
                            onItemSelect: store.setSelectedTarget,
                            popoverProps: {popoverClassName: Classes.MINIMAL},
                            inputValueRenderer: s => s,
                            itemPredicate: (q, v, index) => v.includes(q),
                            itemRenderer: ({handleClick, isActive, item}) => {
                                return menuItem({key: item, onClick: handleClick, text: item});
                            },
                            $items: store.targets || []
                        }),
                        spacer({height: 5}),
                        hbox(
                            filler(),
                            button({text: 'Close', onClick: store.closeTargetDialog}),
                            spacer({width: 5}),
                            button({text: 'OK', onClick: store.doImpersonate, disabled: !store.selectedTarget})
                        )
                    ]
                })
            });
        },

        exitButton() {
            const text = identityService.impersonating ? 'Exit Impersonation' : 'Close';
            return button({text, iconName: 'cross', onClick: this.store.doExit});
        }
    }

    //--------------------------------
    // Semantic
    //--------------------------------
    semantic = {
        store: this.store,

        render() {
            const {impersonating, username} = identityService;
            return hbox({
                padding: 5,
                style: {
                    color: 'white',
                    backgroundColor: 'midnightblue'
                },
                alignItems: 'center',
                items: [
                    semanticIcon({name: 'user'}),
                    spacer({width: 10}),
                    div(`${impersonating ? 'Impersonating' : ''} ${username}`),
                    filler(),
                    this.switchButton(),
                    spacer({width: 4}),
                    this.exitButton()
                ]
            });
        },

        switchButton() {
            const store = this.store,
                targets = store.targets || [];
            return popup({
                trigger: this.button({content: 'Switch User', icon: 'random'}),
                open: store.targetDialogOpen,
                disabled: !store.targets,
                position: 'bottom right',
                on: ['click'],
                onOpen: store.openTargetDialog,
                onClose: store.closeTargetDialog,
                content: vbox({
                    justifyContent: 'right',
                    items: [
                        dropdown({
                            search: true,
                            fluid: true,
                            value: store.selectedTarget,
                            onChange: (ev, data) => store.setSelectedTarget(data),
                            options: targets.map(it => ({text: it, key: it, value: it}))
                        }),
                        spacer({height: 5}),
                        hbox(
                            filler(),
                            this.button({content: 'Close', onClick: store.closeTargetDialog}),
                            spacer({width: 5}),
                            this.button({content: 'OK', onClick: store.doImpersonate, disabled: !store.selectedTarget})
                        )
                    ]
                })
            });
        }, 


        exitButton() {
            const content = identityService.impersonating ? 'Exit Impersonation' : 'Close';
            return this.button({content, icon: 'close', onClick: this.store.doExit});
        },

        button(props) {
            return semanticButton({...props, size: 'tiny', compact: true});
        }

    }
}