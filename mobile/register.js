import {XH} from '@xh/hoist/core';

if (XH._desktopAPIRegistered){
    throw XH.exception('Desktop components imported into mobile app.  Please check your imports.');
}
XH._mobileAPIRegistered = true;