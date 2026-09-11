/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {div, filler, hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {spinner} from '@xh/hoist/cmp/spinner';
import {hoistCmp, HoistProps, uses, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {ReactElement} from 'react';
import {DifferHostModel, DifferHostStatus} from './DifferHostModel';
import {DifferHostsModel} from './DifferHostsModel';
import './Differ.scss';

/**
 * Dropdown for selecting the remote instance to diff against. Reports for each instance whether it
 * is reachable and whether this user is authenticated to it with the rights needed to run a diff,
 * offering a link to visit (and thereby authenticate to) any instance that is not yet ready.
 *
 * @internal
 */
export const differHostPicker = hoistCmp.factory({
    displayName: 'DifferHostPicker',
    className: 'xh-differ-host-picker',
    model: uses(DifferHostsModel),

    render({model, className}) {
        const {isPickerOpen} = model;
        return popover({
            className,
            popoverClassName: 'xh-differ-host-picker__popover',
            isOpen: isPickerOpen,
            placement: 'bottom-start',
            minimal: true,
            item: targetButton(),
            // Unmounted while closed, to avoid ticking relative timestamps in the background.
            content: isPickerOpen ? hostList() : span(),
            onInteraction: open => (model.isPickerOpen = open),
            // Re-check on each open - sessions expire, and instances come and go.
            onOpening: () => model.checkHostsAsync()
        });
    }
});

//------------------------
// Implementation
//------------------------
/** Icon for each status, plus whether visiting the instance is the likely remedy. */
function presentStatus(status: DifferHostStatus): {icon: ReactElement; showVisit: boolean} {
    switch (status) {
        case 'checking':
            return {icon: spinner({compact: true}), showVisit: false};
        case 'ready':
            return {icon: Icon.checkCircle({intent: 'success'}), showVisit: false};
        case 'unauthenticated':
            return {icon: Icon.lock({intent: 'warning'}), showVisit: true};
        case 'unauthorized':
            return {icon: Icon.accessDenied({intent: 'danger'}), showVisit: true};
        case 'offline':
            return {icon: Icon.xCircle({intent: 'danger'}), showVisit: true};
        default:
            return {icon: Icon.questionCircle(), showVisit: false};
    }
}

const targetButton = hoistCmp.factory<DifferHostsModel>(({model}) => {
    const {selectedHost} = model;
    return button({
        className: 'xh-differ-host-picker__target',
        width: 350,
        outlined: true,
        rightIcon: Icon.chevronDown(),
        icon: selectedHost ? presentStatus(selectedHost.status).icon : Icon.server(),
        text: selectedHost?.displayName ?? 'Select an instance...',
        tooltip: selectedHost ? `${selectedHost.url} - ${selectedHost.statusText}` : null
    });
});

const hostList = hoistCmp.factory<DifferHostsModel>(({model}) => {
    const {hosts, isEmpty, isChecking, lastCheckedAt} = model;
    return vbox({
        className: 'xh-differ-host-picker__list',
        items: [
            div({
                omit: !isEmpty,
                className: 'xh-differ-host-picker__empty',
                item: 'No other instances configured - see the xhAppInstances config.'
            }),
            ...hosts.map(host => hostRow({key: host.xhId, model, host})),
            toolbar({
                compact: true,
                items: [
                    button({
                        text: 'Add instance...',
                        icon: Icon.add(),
                        onClick: () => model.addHostAsync()
                    }),
                    filler(),
                    relativeTimestamp({
                        omit: !lastCheckedAt,
                        className: 'xh-differ-host-picker__checked',
                        timestamp: lastCheckedAt,
                        prefix: 'Checked'
                    }),
                    button({
                        icon: Icon.refresh(),
                        tooltip: 'Re-check all instances',
                        disabled: isChecking || isEmpty,
                        onClick: () => model.checkHostsAsync()
                    })
                ]
            })
        ]
    });
});

interface HostRowProps extends HoistProps<DifferHostsModel> {
    host: DifferHostModel;
}

const hostRow = hoistCmp.factory<HostRowProps>(({model, host}) => {
    const {status, statusText, appVersion, appCode, isAppMismatch} = host,
        {icon, showVisit} = presentStatus(status),
        isSelected = model.selectedHost === host;

    return hbox({
        className: 'xh-differ-host-picker__row',
        items: [
            hbox({
                className: 'xh-differ-host-picker__row__main',
                onClick: () => model.selectHost(host),
                items: [
                    div({className: 'xh-differ-host-picker__row__status', item: icon}),
                    vbox({
                        className: 'xh-differ-host-picker__row__text',
                        items: [
                            hbox({
                                className: 'xh-differ-host-picker__row__url',
                                items: [
                                    span(host.displayName),
                                    span({
                                        omit: !appVersion,
                                        className: 'xh-differ-host-picker__row__version',
                                        item: `v${appVersion}`
                                    })
                                ]
                            }),
                            span({className: 'xh-differ-host-picker__row__meta', item: statusText}),
                            hbox({
                                omit: !isAppMismatch,
                                className: 'xh-differ-host-picker__row__mismatch',
                                items: [
                                    Icon.warning({intent: 'warning'}),
                                    span(`Serving '${appCode}', not '${XH.appCode}'`)
                                ]
                            })
                        ]
                    }),
                    filler(),
                    Icon.check({
                        omit: !isSelected,
                        intent: 'primary',
                        className: 'xh-differ-host-picker__row__selected'
                    })
                ]
            }),
            button({
                omit: !showVisit,
                className: 'xh-differ-host-picker__row__visit',
                text: 'Visit',
                icon: Icon.openExternal(),
                tooltip:
                    'Open in a new tab to authenticate via SSO, then return here and re-check.',
                minimal: true,
                onClick: () => host.visit()
            })
        ]
    });
});
