/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

package io.xh.hoist.react

import groovy.util.logging.Slf4j
import io.xh.hoist.security.AccessAll


@Slf4j
@AccessAll
class AppController {

    def index(String appName) {
        renderAppEntryFile("${appName}/index.html")
    }
    
    //------------------------
    // Implementation
    //------------------------
    private void renderAppEntryFile(String fileName) {
        File indexFile = grailsApplication.mainContext.getResource(fileName).file
        String htmlContent = indexFile.text
        render text: htmlContent, contentType:"text/html", encoding:"UTF-8"
    }
}
