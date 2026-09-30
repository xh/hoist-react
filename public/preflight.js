// Start load timer as early as possible - read later in AppStateModel.trackLoad().
window._xhLoadTimestamp = Date.now();

// Track time spent hidden during load - read later in AppStateModel.trackLoad(). Browsers throttle
// or freeze hidden pages, so a load that was hidden at any point (including a page opened in a
// background tab, which starts hidden) will not have a meaningful elapsed time.
(function(W, D) {
    var hiddenSince = D.visibilityState === 'hidden' ? W._xhLoadTimestamp : null,
        pageHidden = hiddenSince != null,
        hiddenMs = 0;

    D.addEventListener('visibilitychange', function() {
        if (D.visibilityState === 'hidden') {
            pageHidden = true;
            if (hiddenSince == null) hiddenSince = Date.now();
        } else if (hiddenSince != null) {
            hiddenMs += Date.now() - hiddenSince;
            hiddenSince = null;
        }
    });

    W._xhGetLoadVisibility = function() {
        return {
            pageHidden: pageHidden,
            hiddenMs: hiddenSince != null ? hiddenMs + Date.now() - hiddenSince : hiddenMs
        };
    };
})(window, document);

// Check browser compatibility with features / syntax we can't polyfill. Currently Mobx 5+ has
// a hard requirement for Proxy (test w/string access for max safety), which effectively filters
// out the browsers (ahem, IE11) we want to block hard and fast here.
(function(W) {
    var D = document,
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

// Use flag below to catch and stop on errors that occur before in-app exception handling active.
if (window.location.search.toLowerCase().indexOf('catchpreflighterror=true') != -1) {
    window.onerror = function (errorMsg, url, line, col, error) {
        document.body.innerHTML = (
            '<div style="margin: 60px auto; font-family: sans-serif; width: 450px; max-width: 80%; text-align: center; padding: 20px; border: 1px solid #ccc;">' +
            '<strong>This application can not be loaded in your current browser</strong><br/><br/>' +
            '<div style="text-align: left">' +
            errorMsg + '<br/>' +
            '<div style="padding-left: 3em; overflow-wrap: anywhere;">' +
            'at ' + url + ':' + line + ':' + col +
            '</div>' + '<br/><br/>' +
            window.navigator.userAgent +
            '</div>' +
            '</div>'
        );
    };
}