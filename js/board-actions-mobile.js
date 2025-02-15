// init mobile board

function setMobileBoard(position = false) {

  gameEnd = false;

  // init board with preloaded position (fen)
  if (position == false) {
    position = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  } else {
    console.log('Custom: ' + position);
  }

  // game rules control object
  game = new Chess(position);

  board = new Chessboard('board', {

    position: position,

    eventHandlers: {

      onPieceSelected: function(notationSquare) {
        var i, movesNotation, movesPosition = [];
        movesNotation = game.moves({square: notationSquare, verbose: true});
        for (i = 0; i < movesNotation.length; i++) {
          movesPosition.push(ChessUtils.convertNotationSquareToIndex(movesNotation[i].to));
        }
        return movesPosition;
      },

      onMove: function(move) {
        if (!gameStarted) {
          gameStarted = true;
          $('#btn-choose-white-side, #btn-choose-black-side').addClass('locked');
        }
        var nextPlayer,
          status,
          move = game.move({
            from: move.from,
            to: move.to,
            promotion: 'q'
          });
        nextPlayer = 'white';
        if (game.turn() === 'b') {
          nextPlayer = 'black';
        }
        if (move !== null) {
          checkPositions('computer');
        }
        setTimeout(function() {
	  opponent.notifyMove(game.fen(), engineSkill)
        }, 1000);
        return game.fen();
      }

    }
  });

  gameHistoryClear();

};
