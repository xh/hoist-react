/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {HoistModel, managed, XH} from '@xh/hoist/core';
import {Constraint, required} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {compact, find, isEmpty, max} from 'lodash';
import {DifferHostModel} from './DifferHostModel';

/** Instance URLs are used as fetch roots, so require a full, absolute URL. */
const validInstanceUrl: Constraint<string> = ({value}) =>
    /^https?:\/\/\S+$/.test(value?.trim())
        ? null
        : 'Enter a full URL, including protocol - e.g. https://remote-host/';

/**
 * Maintains the set of remote instances available to the Differ as comparison sources, sourced from
 * the `xhAppInstances` config plus any ad-hoc URLs entered by the user, and drives the checks that
 * report whether each is up and authenticated.
 *
 * @internal
 */
export class DifferHostsModel extends HoistModel {
    override telemetryPrefix = 'xh.client.admin.differ';

    @managed
    @observable.ref
    hosts: DifferHostModel[] = [];

    @observable.ref
    selectedHost: DifferHostModel = null;

    @bindable
    isPickerOpen: boolean = false;

    get isEmpty(): boolean {
        return isEmpty(this.hosts);
    }

    get isChecking(): boolean {
        return this.hosts.some(it => it.isChecking);
    }

    /** Time of the most recent completed check across all instances. */
    get lastCheckedAt(): Date {
        const times = compact(this.hosts.map(it => it.lastCheckedAt));
        return isEmpty(times) ? null : max(times);
    }

    constructor() {
        super();
        makeObservable(this);

        // All other configured appInstances URLs, excepting the current one.
        // (Use of startsWith allows configs to end in trailing /)
        const urls: string[] = XH.getConf('xhAppInstances', []).filter(
            (it: string) => !it.startsWith(window.location.origin)
        );

        this.hosts = urls.map(url => new DifferHostModel(url));
        this.selectedHost = this.hosts[0] ?? null;
    }

    @action
    selectHost(host: DifferHostModel) {
        this.selectedHost = host;
        this.isPickerOpen = false;
    }

    /** Check all known instances, in parallel. */
    async checkHostsAsync() {
        await Promise.all(this.hosts.map(it => it.checkAsync()));
    }

    /** Prompt for an ad-hoc instance URL, then add, select, and check it. */
    async addHostAsync() {
        this.isPickerOpen = false;

        const url = await XH.prompt<string>({
            title: 'Add Instance',
            icon: Icon.server(),
            message: 'Enter the root URL of another instance of this app to compare against.',
            input: {
                initialValue: 'https://',
                rules: [required, validInstanceUrl]
            }
        });
        if (!url) return;

        const host = new DifferHostModel(url),
            existing = find(this.hosts, {url: host.url});

        if (existing) {
            XH.safeDestroy(host);
            this.selectHost(existing);
        } else {
            this.addHost(host);
        }

        await this.selectedHost.checkAsync();
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    private addHost(host: DifferHostModel) {
        this.hosts = [...this.hosts, host];
        this.selectedHost = host;
    }
}
