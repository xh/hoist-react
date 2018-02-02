/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {identityService, elemFactory} from 'hoist';
import {hbox, vbox, spacer, filler, div} from 'hoist/layout';
import {Classes, button, suggest, icon, popover, menuItem} from 'hoist/kit/blueprint';
import {icon as semanticIcon, button as semanticButton, popup, dropdown} from 'hoist/kit/semantic';
import {observer} from 'hoist/mobx';
import {hoistAppModel} from 'hoist/app/HoistAppModel';

import {ImpersonationBarModel} from './ImpersonationBarModel';

@observer
export class ImpersonationBar extends Component {

    model = new ImpersonationBarModel();

    constructor() {
        super();
        document.addEventListener('keydown', this.onKeyDown);
    }

    render() {
        if (!this.model.isVisible) return null;
        return hoistAppModel.useSemantic ? this.semantic.render() : this.blueprint.render();
    }

    onKeyDown = (e) => {
        if (e.ctrlKey && e.key === 'i') {
            this.model.toggleVisibility();
            e.stopPropagation();
        }
    }

    //---------------------
    // Blueprint
    //---------------------
    blueprint = {
        model: this.model,

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
            const model = this.model;

            return popover({
                target: button({
                    text: 'Switch User',
                    iconName: 'random',
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
                            onItemSelect: model.setSelectedTarget,
                            popoverProps: {popoverClassName: Classes.MINIMAL},
                            inputValueRenderer: s => s,
                            itemPredicate: (q, v, index) => !v || v.includes(q),
                            itemRenderer: ({handleClick, isActive, item}) => {
                                return menuItem({key: item, onClick: handleClick, text: item});
                            },
                            noResults: menuItem({text: 'No Results'}),
                            $items: model.targets || []
                        }),
                        spacer({height: 5}),
                        hbox(
                            filler(),
                            button({text: 'Close', onClick: model.closeTargetDialog}),
                            spacer({width: 5}),
                            button({text: 'OK', onClick: model.doImpersonate, disabled: !model.selectedTarget})
                        )
                    ]
                })
            });
        },

        exitButton() {
            const text = identityService.impersonating ? 'Exit Impersonation' : 'Close';
            return button({text, iconName: 'cross', onClick: this.model.doExit});
        }
    }

    //--------------------------------
    // Semantic
    //--------------------------------
    semantic = {
        model: this.model,

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
            const model = this.model,
                targets = model.targets || [];
            return popup({
                trigger: this.button({content: 'Switch User', icon: 'random'}),
                open: model.targetDialogOpen,
                disabled: !model.targets,
                position: 'bottom right',
                on: ['click'],
                onOpen: model.openTargetDialog,
                onClose: model.closeTargetDialog,
                content: vbox({
                    justifyContent: 'right',
                    items: [
                        dropdown({
                            search: true,
                            placeholder: 'Target User',
                            fluid: true,
                            value: model.selectedTarget,
                            onChange: (ev, data) => model.setSelectedTarget(data.value),
                            options: targets.map(it => ({text: it, key: it, value: it}))
                        }),
                        spacer({height: 5}),
                        hbox(
                            filler(),
                            this.button({content: 'Close', onClick: model.closeTargetDialog}),
                            spacer({width: 5}),
                            this.button({content: 'OK', onClick: model.doImpersonate, disabled: !model.selectedTarget})
                        )
                    ]
                })
            });
        }, 
        
        exitButton() {
            const content = identityService.impersonating ? 'Exit Impersonation' : 'Close';
            return this.button({content, icon: 'close', onClick: this.model.doExit});
        },

        button(props) {
            return semanticButton({...props, size: 'tiny', compact: true});
        }
    }
}
export const impersonationBar = elemFactory(ImpersonationBar);