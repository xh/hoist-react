import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {HoistService, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {isEmpty} from 'lodash';

export class ServerConnectionService extends HoistService {
    static instance: ServerConnectionService;

    @managed
    private timer: Timer;

    private recoveryCount: number = 0;
    private errorCount: number = 0;

    private conf = {
        errorThreshold: 5,
        recoveryThreshold: 3,
        pingInterval: 1
    };

    private isShowingError: boolean = false;

    override async initAsync() {
        const conf = XH.getConf('xhServerConnectionConfig', {});
        if (!isEmpty(conf)) {
            this.conf = conf;
        }
        this.timer = Timer.create({
            runFn: () => this.pingServer(),
            interval: this.conf.pingInterval * SECONDS
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
                ? 'Server Unavailable: Unable to establish connection with server'
                : 'Server Available: Reestablished connection with server',
            icon: showError ? Icon.warning({size: 'lg'}) : Icon.transaction({size: 'lg'}),
            intent: showError ? 'danger' : 'success',
            sortOrder: BannerModel.BANNER_SORTS.SERVER_CONNECTION,
            enableClose: !showError
        });
    }

    private handlePing(requestOk: boolean) {
        if (requestOk) {
            this.recoveryCount += 1;
            this.errorCount = 0;
            if (this.recoveryCount === this.conf.recoveryThreshold && this.isShowingError) {
                this.toggleBanner(false);
            }
            this.recoveryCount = this.recoveryCount % this.conf.recoveryThreshold;
        } else {
            this.recoveryCount = 0;
            this.errorCount += 1;
            if (this.errorCount === this.conf.errorThreshold && !this.isShowingError) {
                this.toggleBanner(true);
            }
            this.errorCount = this.errorCount % this.conf.errorThreshold;
        }
    }

    private async pingServer() {
        try {
            let res = await XH.fetch({
                url: 'ping'
            });
            this.handlePing(res.ok);
        } catch (exception) {
            this.handlePing(false);
        }
    }
}
