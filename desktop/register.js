import {XH} from '@xh/hoist/core';

if(XH._mobileAPIRegistered){
    throw "`Mobile files imported into desktop app.  Please check your imports.`";
}
XH._desktopAPIRegistered = true;
