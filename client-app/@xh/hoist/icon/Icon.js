/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {elemFactory} from 'hoist/core';

import fontawesome from '@fortawesome/fontawesome';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import solid from '@fortawesome/fontawesome-pro-solid';

// TODO - check if this is necessary and what exactly it does...
fontawesome.library.add(solid);

/**
 * Singleton class to provide getters for enumerated icons, each returning a FontAwesome SVG element.
 * Currently importing the licensed "pro" library with additional icons - note this requires fetching
 * the FA npm package via a registry URL w/license token. See https://fontawesome.com/pro#license.
 *
 * A faIcon() method is also exported for direct access to the FA React component API.
 * See https://github.com/FortAwesome/react-fontawesome.
 */
class _Icon {

    get add()           {return this.el('plus-circle')}
    get angleLeft()     {return this.el('angle-left')}
    get angleRight()    {return this.el('angle-right')}
    get check()         {return this.el('check')}
    get delete()        {return this.el('minus-circle')}
    get edit()          {return this.el('edit')}
    get eye()           {return this.el('eye')}
    get info()          {return this.el('info-circle')}
    get mail()          {return this.el('envelope')}
    get moon()          {return this.el('moon')}
    get refresh()       {return this.el('sync')}
    get sun()           {return this.el('sun')}


    el(name) {
        return faIcon({icon: name});
    }
}

export const faIcon = elemFactory(FontAwesomeIcon);
export const Icon = new _Icon();
