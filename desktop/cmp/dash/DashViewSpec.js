/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js';
import {startCase} from 'lodash';

/**
 * Spec used to generate DashViews and DashViewModels within a DashContainer or DashCanvas.
 *
 * This is a base class for {@link DashContainerViewSpec} and {@link DashCanvasViewSpec}
 */
export class DashViewSpec {

    id;
    content;
    title;
    icon;
    groupName;
    omit;
    unique;
    allowAdd;
    allowRemove;
    allowRename;

    /**
     * @param {string} id - unique identifier of the DashViewSpec
     * @param {(ReactElement|Object|function)} content - content to be rendered by this DashView.
     *      Element, HoistComponent or a function returning a react element.
     * @param {string} [title] - Title text added to the tab header.
     * @param {Element} [icon] - An icon placed at the left-side of the tab header.
     * @param {string} [groupName] - Group name to display within the add view component.
     *      The default context menu will automatically group its available views if provided.
     * @param {boolean} [omit] - true to prevent any instances of this view. References to this
     *      view in state will be quietly dropped. Default false.
     * @param {boolean} [unique] - true to prevent multiple instances of this view. Default false.
     * @param {boolean} [allowAdd] - true (default) to allow adding new instances of this view.
     *      References to this view in state will be respected.
     * @param {boolean} [allowRemove] - true (default) to allow removing instances from the DashContainer.
     * @param {boolean} [allowRename] - true (default) to allow renaming the view.

     * @param {...*} [rest] - additional properties to store on the DashViewSpec
     */
    constructor({
        id,
        content,
        title = startCase(id),
        icon,
        groupName,
        omit = false,
        unique = false,
        allowAdd = true,
        allowRemove = true,
        allowRename = true,
        ...rest
    }) {
        throwIf(!id, 'DashViewSpec requires an id');
        throwIf(!content, 'DashViewSpec requires content');
        throwIf(!title, 'DashViewSpec requires a title');

        Object.assign(this, rest);

        this.id = id;
        this.content = content;
        this.title = title;
        this.icon = icon;
        this.groupName = groupName;
        this.omit = omit;
        this.unique = unique;
        this.allowAdd = allowAdd;
        this.allowRemove = allowRemove;
        this.allowRename = allowRename;
    }

    //---------------------
    // Hoist Implementation
    //---------------------
    get goldenLayoutConfig() {
        const {id, title, allowRemove} = this;
        return {
            component: id,
            type: 'react-component',
            title,
            isClosable: allowRemove
        };
    }
}
