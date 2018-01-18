/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

package io.xh.hoist.react

import io.xh.hoist.BaseController
import io.xh.hoist.security.AccessAll


@AccessAll()
class AuthController extends BaseController {

    def authenticationService

    def authUser(String username, String password) {
        renderJSON(authUser: identityService.getAuthUser())
    }

    def login(String username, String password) {
        renderJSON(success: authenticationService.login(request, username, password))
    }
}
