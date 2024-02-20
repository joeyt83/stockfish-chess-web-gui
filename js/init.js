function is_touch_device() {
    return 'ontouchstart' in window || navigator.maxTouchPoints;
};

function loadCss(cssId, cssHref) {
    $('#' + cssId).attr('href', cssHref);
}


window.onload = function(e) {
    var isMobile = is_touch_device();

    var outstandingLibs = 8

    async function getGameState() {
        const state = await response.json();
        return state
    }

    function registerResourceLoaded() {
        outstandingLibs--;
        if (outstandingLibs == 0) {
            console.log('Loading remote game state');
            $.get("/server/game_status", function(statusJson) {
                console.log(statusJson);
	        var fen = statusJson["fen"]
                if (isMobile) {
                    setMobileBoard(fen)
                } else {
                    setDesktopBoard(fen)
                }
            });
        }
    }

    if (isMobile == true) {
        console.log('Loading mobile');

        var chess, board;

        loadCss('chessboard-css', 'css/caustique-chessboard.css');

        $.getScript('js/chessboard-caustique-min.js', registerResourceLoaded);
        $.getScript('js/board-controls-side.js', registerResourceLoaded);
        $.getScript('js/board-controls-bottom.js', registerResourceLoaded);
        $.getScript('js/board-sets.js', registerResourceLoaded);

        $.getScript('js/board-time.js', registerResourceLoaded);
        $.getScript('js/board-actions.js', registerResourceLoaded);
        $.getScript('js/board-actions-mobile.js', registerResourceLoaded);
        $.getScript('js/board-init.js', registerResourceLoaded);
    } else {
        console.log('Loading DDDDDdesktop');

        loadCss('chessboard-css', 'css/chessboard.css');

        $.getScript('js/chessboard.min.js', registerResourceLoaded);
        $.getScript('js/board-controls-side.js', registerResourceLoaded);
        $.getScript('js/board-controls-bottom.js', registerResourceLoaded);
        $.getScript('js/board-sets.js', registerResourceLoaded);

        $.getScript('js/board-time.js', registerResourceLoaded);
        $.getScript('js/board-actions.js', registerResourceLoaded);
        $.getScript('js/board-actions-desktop.js', registerResourceLoaded);
        $.getScript('js/board-init.js', registerResourceLoaded);
    }


}
