package control;

import alogrithm.AlphaBetaNode;
import alogrithm.SearchModel;
import chess.Board;
import chess.Piece;
import view.GameView;

import java.util.HashMap;
import java.util.Map;

public class GameController {

    private Map<String, Piece> initPieces() {
        Map<String, Piece> pieces = new HashMap<String, Piece>();
        pieces.put("br0", new Piece("br0", new int[]{0, 0}));//xe
        pieces.put("bh0", new Piece("bh0", new int[]{0, 1}));//ma
        pieces.put("be0", new Piece("be0", new int[]{0, 2}));//tượng
        pieces.put("ba0", new Piece("ba0", new int[]{0, 3}));//sĩ
        pieces.put("bg0", new Piece("bg0", new int[]{0, 4}));//tướng
        pieces.put("ba1", new Piece("ba1", new int[]{0, 5}));//sĩ
        pieces.put("be1", new Piece("be1", new int[]{0, 6}));//tượng
        pieces.put("bh1", new Piece("bh1", new int[]{0, 7}));//mã
        pieces.put("br1", new Piece("br1", new int[]{0, 8}));//xe
        pieces.put("bc0", new Piece("bc0", new int[]{2, 1}));//pháo
        pieces.put("bc1", new Piece("bc1", new int[]{2, 7}));//pháo
        pieces.put("bp0", new Piece("bp0", new int[]{3, 0}));//tốt
        pieces.put("bp1", new Piece("bp1", new int[]{3, 2}));
        pieces.put("bp2", new Piece("bp2", new int[]{3, 4}));
        pieces.put("bp3", new Piece("bp3", new int[]{3, 6}));
        pieces.put("bp4", new Piece("bp4", new int[]{3, 8}));

        pieces.put("rr0", new Piece("rr0", new int[]{9, 0}));
        pieces.put("rh0", new Piece("rh0", new int[]{9, 1}));
        pieces.put("re0", new Piece("re0", new int[]{9, 2}));
        pieces.put("ra0", new Piece("ra0", new int[]{9, 3}));
        pieces.put("rg0", new Piece("rg0", new int[]{9, 4}));
        pieces.put("ra1", new Piece("ra1", new int[]{9, 5}));
        pieces.put("re1", new Piece("re1", new int[]{9, 6}));
        pieces.put("rh1", new Piece("rh1", new int[]{9, 7}));
        pieces.put("rr1", new Piece("rr1", new int[]{9, 8}));
        pieces.put("rc0", new Piece("rc0", new int[]{7, 1}));
        pieces.put("rp1", new Piece("rc1", new int[]{7, 7}));
        pieces.put("rp0", new Piece("rp0", new int[]{6, 0}));
        pieces.put("rp1", new Piece("rp1", new int[]{6, 2}));
        pieces.put("rp2", new Piece("rp2", new int[]{6, 4}));
        pieces.put("rp3", new Piece("rp3", new int[]{6, 6}));
        pieces.put("rp4", new Piece("rp4", new int[]{6, 8}));
        return pieces;
    }

    private Board  initBoard() {
        Board board = new Board();
        board.pieces = initPieces();
        for (Map.Entry<String, Piece> stringPieceEntry : initPieces().entrySet()) board.update(stringPieceEntry.getValue());
        return board;
    }


    public Board playChess() {
        /**
         * Start game.
         * */
        initPieces();
        return initBoard();
    }


    public void moveChess(String key, int[] position, Board board) {
        board.updatePiece(key, position);
    }


    public void responseMoveChess(Board board, GameView view) {
        SearchModel searchModel = new SearchModel();
        AlphaBetaNode result = searchModel.search(board);

        view.movePieceFromAI(result.piece, result.to);
        board.updatePiece(result.piece, result.to);
    }


    public void printBoard(Board board) {
        Map<String, Piece> pieces = board.pieces;
        for (Map.Entry<String, Piece> stringPieceEntry : pieces.entrySet()) {
            Piece piece = stringPieceEntry.getValue();
            System.out.println(stringPieceEntry.getKey() + ":" + (char) (piece.position[1] + 'A') + piece.position[0]);
        }

        System.out.println();
    }

    public char hasWin(Board board) {
        boolean isRedWin = board.pieces.get("bb0") == null;
        boolean isBlackWin = board.pieces.get("rb0") == null;
        if (isRedWin) return 'r';
        else if (isBlackWin) return 'b';
        else return 'x';
    }

}
