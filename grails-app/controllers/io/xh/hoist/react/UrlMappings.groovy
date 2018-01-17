/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

package io.xh.hoist.react

class UrlMappings {

    static mappings = {

        //-------------------------------
        // Default Grails Conventions
        //--------------------------------
        "/"(controller: "default")
        "/$controller/$action?/$id?(.$format)?"{}
        
        "/app/$appName"(controller: "app", action: "index")


        "404"(view:'/notFound')
    }
}
