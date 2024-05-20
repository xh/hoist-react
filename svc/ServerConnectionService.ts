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
export class ServerConnectionService extends HoistService {
    static instance: ServerConnectionService;

    @managed
    private timer: Timer;

    private recoveryCount: number = 0;
    private errorCount: number = 0;

    private conf;

    private isShowingError: boolean = false;

    override async initAsync() {
        this.conf = XH.getConf('xhServerConnectionConfig', {
            errorThreshold: 5,
            recoveryThreshold: 3,
            checkIntervalSecs: 1
        });

        this.timer = Timer.create({
            runFn: () => this.pingServer(),
            interval: this.conf.checkIntervalSecs * SECONDS
        });
    }

    //------------------
    //  Implementation
    //------------------
    private toggleBanner(showError: boolean) {
        this.isShowingError = showError;

        XH.showBanner({
            category: 'xhAppServerHealth',
            message: showError
                ? 'Server Unavailable: Unable to establish connection'
                : 'Server Available: Reestablished connection',
            icon: showError ? Icon.warning({size: 'lg'}) : Icon.transaction({size: 'lg'}),
            intent: showError ? 'danger' : 'success',
            sortOrder: BannerModel.BANNER_SORTS.SERVER_CONNECTION,
            enableClose: !showError
        });
    }

    private handlePingOK() {
        this.errorCount = 0;
        if (!this.isShowingError) return;

        this.recoveryCount += 1;
        if (this.recoveryCount === this.conf.recoveryThreshold) {
            this.toggleBanner(false);
        }
    }

    private handlePingFail() {
        this.recoveryCount = 0;
        if (this.isShowingError) return;

        this.errorCount += 1;
        if (this.errorCount === this.conf.errorThreshold) {
            this.toggleBanner(true);
        }
    }

    private async pingServer() {
        try {
            await XH.fetch({url: 'ping'});
            this.handlePingOK();
        } catch (exception) {
            this.logError('Failure in ping call', exception);
            this.handlePingFail();
        }
    }
}
