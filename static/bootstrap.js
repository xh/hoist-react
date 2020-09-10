window._xhLoadTimestamp = Date.now();

(function(W) {
    var D = document,
        // Mobx 5+ has a hard requirement for Proxy (test w/string access for max safety).
        hasProxy = W['Proxy'];

    if (!hasProxy) {
        D.body.innerHTML = (
            '<div style="margin:80px auto; font-family: sans-serif; width:450px; text-align:center; padding: 20px; border: 1px solid #ccc;">' +
            'This application can not be loaded in your current browser<br/>' +
            'due to missing support for modern web technologies.<br/><br/>' +
            'Try again with an updated browser such as Chrome.' +
            '</div>'
        );
        try {W.stop()} catch (e) {}
        try {D.execCommand('Stop')} catch (e) {}
    }
})(window);