import {pick, toPlainObject} from 'lodash';

/**
 * Extract information about the client browser window and screen
 */
export function getClientDeviceInfo() {
    const data = pick(window, 'screen', 'devicePixelRatio', 'screenX', 'screenY', 'innerWidth', 'innerHeight', 'outerWidth', 'outerHeight');
    if (data.screen) {
        data.screen = toPlainObject(data.screen);
        if (data.screen.orientation) {
            data.screen.orientation = toPlainObject(data.screen.orientation);
            delete data.screen.orientation.onchange;
        }
    }

    return data;
}
