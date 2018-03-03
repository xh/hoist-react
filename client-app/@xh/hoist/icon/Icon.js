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
 * Singleton class to provide factories for enumerated icons, each returning a FontAwesome SVG element.
 *
 * Currently importing the licensed "pro" library with additional icons - note this requires fetching
 * the FA npm package via a registry URL w/license token. See https://fontawesome.com/pro#license.
 */
export const Icon = {
    add(p)           {return fa(p, 'plus-circle')},
    angleLeft(p)     {return fa(p, 'angle-left')},
    angleRight(p)    {return fa(p, 'angle-right')},
    check(p)         {return fa(p, 'check')},
    delete(p)        {return fa(p, 'minus-circle')},
    edit(p)          {return fa(p, 'edit')},
    eye(p)           {return fa(p, 'eye')},
    info(p)          {return fa(p, 'info-circle')},
    mail(p)          {return fa(p, 'envelope')},
    moon(p)          {return fa(p, 'moon')},
    refresh(p)       {return fa(p, 'sync')},
    sun(p)           {return fa(p, 'sun')},
    cross(p)         {return fa(p, 'times')},
    user(p)          {return fa(p, 'user')}
}

//-----------------------------
// Implementation
//-----------------------------
const faIcon = elemFactory(FontAwesomeIcon);
const fa = function (props, name) {
    return faIcon({icon: name, ...props});
}
