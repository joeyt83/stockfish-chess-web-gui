var
    board, // chess board obj
    game, // chess game control obj

    gameTimer,
    gameStarted = false,

    playerSide = 'w', // manual seetings
    opponentSide = 'b',
    firstTurn = 'player',

    promotionPos,
    moveSource,
    moveTarget,

    promotionFigure = 'q', // promotion figure, Queen as default
    promotionEvent,

    togglePlayer = false,
    engineDisabled = false,

    engineSkill = 8, // default engine depth (AI difficulty)
    staticSkill = 16,


    stateAnalyze = false, // flag if game in analyze state
    stateAnalyzeMatch = '',

    stateHint = false,
    gameEnd = false; // flag for stall, checkmate, etc

// Init engine


function dumpLog(data) {
    if (!data) {
        $('.chess-log').html('');
    } else {
        $('.chess-log').html($('.chess-log').html() + data + '<br />');
    }
}

function listMoves() {
    var movesArray = game.history();
    var movesHtml = '';
    var turnFrom = 1;
    for (i = 0; i < movesArray.length; i = i + 2) {
        if (movesArray[i + 1] == undefined) {
            movesHtml += '<li><span turn=' + turnFrom + '>' + movesArray[i] + '</span><span></span></li>';
        } else {
            movesHtml += '<li><span turn=' + turnFrom + '>' + movesArray[i] + '</span><span turn=' + (turnFrom + 1) + '>' + movesArray[i + 1] + '</span></li>';
        }
        turnFrom = turnFrom + 2;
    }
    $('#game-turns-history ol').html(movesHtml);
    $('#game-turns-history li span').off().click(function() {
        var turnN = parseInt($(this).attr('turn'));
        console.log('History: show turn ' + $(this).attr('turn'));
        moves = JSON.parse(localStorage.getItem('boardHistory'));
        console.log(moves[turnN - 1]);
        loadBoard(moves[turnN - 1], true);
    });
}

function calcFieldNum(fieldCode) {
    let letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    var j = 0;
    var num = 0;

    if (board.orientation() === 'w') {
        for (var i = 8; i > 0; i--) {
            letters.map(function(letter) {
                if (letter + i === fieldCode) {
                    num = j;
                }
                j++;
            });
        }
    } else {
        letters = letters.reverse();
        for (var i = 1; i <= 8; i++) {
            letters.map(function(letter) {
                if (letter + i === fieldCode) {
                    num = j;
                }
                j++;
            });
        }
    }

    return num;
}

const makeMove = function(moveStr) {

    var match = moveStr.match(/([a-h][1-8])([a-h][1-8])([qrbk])?/);
    stopTimer();

    console.log("MOVESTR", moveStr)
    console.log("MATCH", match)
    var move = game.move({
        from: match[1],
        to: match[2],
        promotion: match[3]
    });

    console.log(game.fen());

    board.position(game.fen());

    checkPositions('player');
    checkAnalyzeOption();

    if (game.history().length > 0) {
        $('#btn-take-back').removeClass('disabled');
    }

    listMoves();
    startTimer();

    gameHistoryAddMove(game.fen());
}

const theAIopponent = {
    stockfish: new Worker('js/stockfish.js'),

    notifyEngine: function(fen, engineSkill) {
        this.stockfish.postMessage('position fen ' + fen);
        this.stockfish.postMessage('go depth ' + engineSkill);
    },

    updateEngineSkill: function(engineSkill) {
        this.stockfish.postMessage('setoption name skill level value ' + engineSkill);
    },

    solicitFirstMove: function(fen, engineSkill, turn) {
        var updatedFen = fen + ' ' + turn
        this.notifyEngine(updatedFen, engineSkill)
    },

    notifyMove: function(fen, engineSkill) {
        this.notifyEngine(fen, engineSkill)
    },

    handleMove: function(eventStr) {
        var match = eventStr.match(/^bestmove ([a-h][1-8][a-h][1-8][qrbk])?/);

        if (match) {
            console.log('Match and move.');
	    // TODO. Fix this as it currently extracts the wrong part of the eventStr
            makeMove(match[0])
        }
    },

    solicitHint: function(fen, engineSkill) {
        this.notifyEngine(fen, engineSkill)
    },

    handleHint: function(eventStr) {
        var match = eventStr.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbk])?/);

        if (match) {
            $('#board .square-' + match[1]).css('background', '#f7c5cd');
            $('#board .square-' + match[2]).css('background', '#f7c5cd');
            $('#board_chess_square_' + calcFieldNum(match[1])).css('background', '#f7c5cd');
            $('#board_chess_square_' + calcFieldNum(match[2])).css('background', '#f7c5cd');

            stateHint = false;
            $('#btn-show-hint').removeClass('loading disabled');

            setTimeout(function() {
                $('#board .square-55d63').css('background', '');
                $('.chess_square').css('background', '');
            }, 2500);
        }
    },

    solicitAnalysis: function(fen, engineSkill) {
        this.notifyEngine(fen, engineSkill)
    },

    handleAnalysis: function(eventStr) {
        var regex = new RegExp("info depth " + staticSkill + " seldepth .*? pv (.*)");
        var seldepthMatch = regex.exec(eventStr);

        if (seldepthMatch) {
            console.log('Analyze entry match.');

            var moves = seldepthMatch[1].split(' ');
            stateAnalyzeMatch = '';
            for (var i = 0, len = 5; i < len; i++) {
                stateAnalyzeMatch += (i + 1) + '. ' + moves[i] + ' ';
            }
        };

        var regex = new RegExp("bestmove .*");
        var bestmoveMatch = regex.exec(eventStr);

        if (bestmoveMatch) {
            $('#game-analyze-string').text(stateAnalyzeMatch).removeClass('hidden');;
            stateAnalyze = false;
            $('#btn-analyze').removeClass('disabled loading');

        }
    },

    init: function() {
        // Keep these references to use inside the onmessage handler.
        // ('this' changes inside that handler).
        const handleHint = this.handleHint
        const handleAnalysis = this.handleAnalysis
        const handleMove = this.handleMove

        this.stockfish.onmessage = function(event) {

            console.log(event.data);

            /* dumpLog(event.data); */

            var eventStr = event.data;

            if (stateHint == 'grep') {
                handleHint(eventStr)
                return;
            }

            if (stateAnalyze == 'grep') {
                handleAnalysis(eventStr)
                return;
            }

            if ((eventStr.indexOf('bestmove') + 1) && stateAnalyze == 'done') {
                stateAnalyze = false;
                return;
            }

            if (eventStr.indexOf('bestmove') + 1) {
                $('#board-positions-data').text('Tactical solution: ' + event.data);
            }

            if (!stateAnalyze && !stateHint) {
                handleMove(eventStr)
            }

        };
    }

}

const theJoeOpponent = {

    notifyMove: function(localFen, engineSkill, moveMade = true) {
        // Engine skill is ignored.

        console.log("notifyMove called with local fen", localFen)
        if (moveMade) {
            // python chess lib on the server side ignores the en passant square in fens so we remove.
            // see https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation            
            var localFenParts = localFen.split(' ')
            newFenParts = localFenParts.slice(0, 3)
            newFenParts.push("-")
            newFenParts.push(...localFenParts.slice(4))
            localFen = newFenParts.join(' ')

            $.post("/server/game_status", {
                "fen": localFen,
                "player": "w"
            }, function(resp) {
                console.log("Move succesfully registered.", localFen)
            })
        }

        var pollIntervalId = window.setInterval(function() {
            $.get("/server/game_status", function(statusJson) {
                console.log(statusJson);
                var remoteFen = statusJson["fen"]
                console.log("checking local fen", localFen)
                console.log("checking remote fen", remoteFen)
                if (localFen == remoteFen) {
                    // Do nothing - no remote move made.
                } else {
                    clearInterval(pollIntervalId)
                    var lastMove = statusJson["last_move"]
                    console.log("REMOTE MOVE DETECTED", lastMove)
                    makeMove(lastMove)
                }
            })
        }, 2000)
    },

    updateEngineSkill: function(engineSkill) {
        console.log("Engine skill not applicable to the Joe opponent.")
    },

    solicitFirstMove: function(fen, engineSkill, turn) {
        console.log("Solicit first move is not applicable to the Joe opponent.")
    },

    solicitHint: function(fen, engineSkill) {
        console.log("Hints are not applicable to the Joe opponent.")
    },

    solicitAnalysis: function(fen, engineSkill) {
        console.log("Analysis is not applicable to the Joe opponent.")
    },

    init: function() {

    }

}

theAIopponent.init()
theJoeOpponent.init()
var opponent = theJoeOpponent
