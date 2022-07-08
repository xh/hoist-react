import {XH} from '@xh/hoist/core';

if(XH._mobileAPIRegistered === true){
    throw "no";
}
XH._desktopAPIRegistered = true;
