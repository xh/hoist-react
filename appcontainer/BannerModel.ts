/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {BannerSpec, HoistModel} from '@xh/hoist/core';

/**
 * Model for a single instance of a banner. Immutable.
 * @internal
 */
export class BannerModel extends HoistModel {
    override xhImpl = true;

    // Immutable public properties
    category;
    icon;
    message;
    intent;
    sortOrder;
    className;
    enableClose;
    onClose;
    onClick;
    actionButtonProps;
    props;

    BannerSourceModel;

    static BANNER_SORTS = {
        APP_UPDATE_SORT: -2,
        ADMIN_ALERT_SORT: -1
    };

    constructor({
        category = 'default',
        icon,
        message,
        intent = 'primary',
        sortOrder,
        className,
        enableClose = true,
        onClose,
        onClick,
        actionButtonProps,
        ...props
    }: BannerSpec) {
        super();

        this.category = category;
        this.icon = icon;
        this.message = message;
        this.intent = intent;

        this.sortOrder = sortOrder;

        this.className = className;
        this.enableClose = enableClose;
        this.onClose = onClose;
        this.onClick = onClick;
        this.actionButtonProps = actionButtonProps;
        this.props = props;
    }
}
