import {XH} from '@xh/hoist/core';

if(XH._desktopAPIRegistered === true){
    throw "no";
 }
 XH._mobileAPIRegistered = true;