/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {HoistService, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';

/**
 * Service to provide heartbeat monitoring for connected server.
 *
 * In the case of lost/dropped connection, it will display a banner
 * indicating state of the server's connection
 *
 * */

interface ServerConnectivityConfig {
    enabled: boolean;
    errorThreshold: number;
    recoveryThreshold: number;
    checkIntervalSecs: number;
}

export class ServerConnectivityService extends HoistService {
    static instance: ServerConnectivityService;

    connected: boolean;
    lastCheckSuccess: Date;
    lastCheckFailure: Date;

    @managed
    private timer: Timer;
    private errorCount: number = 0;
    private recoveryCount: number = 0;
    private isShowingError: boolean = false;
    private config: ServerConnectivityConfig;

    override async initAsync() {
        this.config = XH.getConf('xhServerConnectivityConfig');
        this.timer = Timer.create({
            runFn: () => this.pingServer(),
            interval: this.config.checkIntervalSecs * SECONDS
        });
    }

    //------------------
    //  Implementation
    //------------------
    private async pingServer() {
        try {
            await XH.fetch({url: 'ping', timeout: 10 * SECONDS});
            this.handlePingOK();
        } catch (exception) {
            this.handlePingFail();
        }
    }

    private handlePingOK() {
        this.errorCount = 0;
        this.lastCheckSuccess = new Date();
        if (!this.isShowingError) return;

        this.recoveryCount += 1;
        if (this.recoveryCount === this.config.recoveryThreshold) {
            this.connected = true;
            this.toggleBanner(false);
        }
    }

    private handlePingFail() {
        this.recoveryCount = 0;
        this.errorCount += 1;
        this.lastCheckFailure = new Date();

        if (this.isShowingError) return;

        if (this.errorCount === this.config.errorThreshold) {
            this.connected = false;
            this.toggleBanner(true);
            this.logError('Failure to connect to server');
        }
    }

    private toggleBanner(showError: boolean) {
        this.isShowingError = showError;
        if (!showError) {
            XH.hideBanner('xhAppServerHealth');
            XH.toast({
                message: 'Server Available: Reestablished connection',
                intent: 'success'
            });
            return;
        }

        XH.showBanner({
            category: 'xhAppServerHealth',
            message: `Server Unavailable: Unable to establish connection, last successful connection check was at ${this.lastCheckSuccess}`,
            icon: Icon.warning({size: 'lg'}),
            intent: 'danger',
            sortOrder: BannerModel.BANNER_SORTS.SERVER_CONNECTION,
            enableClose: false
        });
    }
}
