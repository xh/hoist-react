/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

package io.xh.hoist.react.security

import groovy.transform.CompileStatic
import javax.servlet.http.HttpServletRequest

/**
 * Applications must define a concrete implementation of this service with the name 'AuthenticationService'
 */
@CompileStatic
abstract class BaseAuthenticationService extends io.xh.hoist.security.BaseAuthenticationService {

    protected boolean isWhitelist(HttpServletRequest request) {
        return super.isWhitelist(request)  || request.requestURI.startsWith('/auth/')
    }
}