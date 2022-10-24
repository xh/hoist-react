/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {Intent, XH} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {assign} from 'lodash';
import {ReactElement} from 'react';

/**
 *  Basic Model for an item displayed within a generic ContextMenu.
 *  @see RecordAction for a more specific (and common) implementation tied to data views.
 */
export class ContextMenuItem {

    /** Label to be displayed. */
    text: string;

    /** Icon to be displayed. */
    icon: ReactElement;

    /** Intent to be used for rendering the action. */
    intent: Intent;

    /** Executed when the user clicks the menuitem. */
    actionFn: () => void;

    /** Child menu items. */
    items: Partial<ContextMenuItem>[];

    /** True to disable this item. */
    disabled: boolean;

    /** True to hide this item. */
    hidden: boolean;

    constructor({
        text,
        icon = null,
        intent,
        actionFn = null,
        items = null,
        disabled = false,
        hidden = false
    }: Partial<ContextMenuItem>) {
        this.text = text;
        this.icon = icon;
        this.intent = intent;
        this.actionFn = actionFn;
        this.items = items;
        this.disabled = disabled;
        this.hidden = hidden;
    }

    /**
     * Standard Framework Menu Items.
     * // Todo: Are these used anywhere? Should they return instances instead of partials?
     */
    static reloadApp(defs: Partial<ContextMenuItem>): Partial<ContextMenuItem> {
        return assign({
            text: 'Reload App',
            icon: Icon.refresh(),
            actionFn: () => XH.reloadApp()
        }, defs);
    }

    static about(defs: Partial<ContextMenuItem>): Partial<ContextMenuItem> {
        return assign({
            text: 'About',
            icon: Icon.info(),
            hidden: !XH.appContainerModel.hasAboutDialog(),
            actionFn: () => XH.showAboutDialog()
        }, defs);
    }

    static logout(defs: Partial<ContextMenuItem>): Partial<ContextMenuItem> {
        return assign({
            text: 'Logout',
            icon: Icon.logout(),
            hidden: XH.appSpec.isSSO,
            actionFn: () => XH.identityService.logoutAsync()
        }, defs);
    }
}
