import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, User, Cpu, Grid3x3, Maximize2 } from 'lucide-react';

export default function TorusTicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState([]);
  const [allLines, setAllLines] = useState([]);
  const [gameMode, setGameMode] = useState(null); // null, 'human', 'computer'
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [viewMode, setViewMode] = useState('compact'); // 'compact' or 'infinite'
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const canvasRef = useRef(null);

  // Map 4x4 visual position (0-15) to 3x3 logical position (0-8)
  const visualToLogical = (visualPos) => {
    const mapping = {
      0: 0,  3: 0,  12: 0, 15: 0,
      1: 1,  13: 1,
      2: 2,  14: 2,
      4: 3,  7: 3,
      8: 6,  11: 6,
      5: 4,
      6: 5,
      9: 7,
      10: 8,
    };
    return mapping[visualPos];
  };

  // Generate all valid winning lines on a 3x3 torus
  useEffect(() => {
    const lines = new Set();
    
    for (let start = 0; start < 9; start++) {
      const startRow = Math.floor(start / 3);
      const startCol = start % 3;
      
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          
          const positions = [];
          for (let step = 0; step < 3; step++) {
            const row = (startRow + dx * step + 9) % 3;
            const col = (startCol + dy * step + 9) % 3;
            positions.push(row * 3 + col);
          }
          
          const sortedLine = positions.slice().sort((a, b) => a - b).join(',');
          lines.add(sortedLine);
        }
      }
    }
    
    const linesArray = Array.from(lines).map(line => 
      line.split(',').map(Number)
    );
    
    setAllLines(linesArray);
  }, []);

  const checkWinner = (squares) => {
    for (let line of allLines) {
      const [a, b, c] = line;
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line };
      }
    }
    return null;
  };

  // Computer AI
  const getComputerMove = (currentBoard) => {
    const emptyPositions = currentBoard
      .map((val, idx) => val === null ? idx : null)
      .filter(val => val !== null);

    if (emptyPositions.length === 0) return null;

    // Check if computer can win
    for (let pos of emptyPositions) {
      const testBoard = [...currentBoard];
      testBoard[pos] = 'O';
      if (checkWinner(testBoard)) {
        return pos;
      }
    }

    // Check if need to block player
    for (let pos of emptyPositions) {
      const testBoard = [...currentBoard];
      testBoard[pos] = 'X';
      if (checkWinner(testBoard)) {
        return pos;
      }
    }

    // Prefer center positions (4, 5, 7, 8)
    const centerPositions = [4, 5, 7, 8].filter(p => emptyPositions.includes(p));
    if (centerPositions.length > 0) {
      return centerPositions[Math.floor(Math.random() * centerPositions.length)];
    }

    // Take corner (position 0)
    if (emptyPositions.includes(0)) {
      return 0;
    }

    // Take any remaining position
    return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
  };

  // Trigger computer move when it's O's turn
  useEffect(() => {
    if (gameMode === 'computer' && !isXNext && !winner && allLines.length > 0) {
      setIsComputerThinking(true);
      const timeout = setTimeout(() => {
        const move = getComputerMove(board);
        if (move !== null) {
          makeMove(move);
        }
        setIsComputerThinking(false);
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [isXNext, winner, gameMode, board, allLines]);

  const makeMove = (logicalPos) => {
    if (board[logicalPos] || winner) return;

    const newBoard = [...board];
    newBoard[logicalPos] = isXNext ? 'X' : 'O';
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result) {
      setWinner(result.winner);
      setWinningLine(result.line);
    } else {
      setIsXNext(!isXNext);
    }
  };

  const handleClick = (visualPos) => {
    if (gameMode === 'computer' && !isXNext) return;
    
    const logicalPos = visualToLogical(visualPos);
    makeMove(logicalPos);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine([]);
    setIsComputerThinking(false);
  };

  const startNewGame = (mode) => {
    setGameMode(mode);
    resetGame();
  };

  const backToMenu = () => {
    setGameMode(null);
    resetGame();
    setViewMode('compact');
    setPanOffset({ x: 0, y: 0 });
  };

  // Infinite view handlers
  const handleMouseDown = (e) => {
    if (viewMode === 'infinite') {
      setIsDragging(true);
      setHasDragged(false);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && viewMode === 'infinite') {
      const movedX = Math.abs(e.clientX - dragStart.x - panOffset.x);
      const movedY = Math.abs(e.clientY - dragStart.y - panOffset.y);
      
      // Only consider it a drag if moved more than 5 pixels
      if (movedX > 5 || movedY > 5) {
        setHasDragged(true);
      }
      
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleInfiniteClick = (e) => {
    if (viewMode !== 'infinite' || hasDragged) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const squareSize = 80;
    
    // Get click position relative to viewport center, accounting for pan
    const clickX = e.clientX - rect.left - 300;
    const clickY = e.clientY - rect.top - 300;
    
    // Adjust for pan offset to get actual grid position
    const gridX = clickX - panOffset.x;
    const gridY = clickY - panOffset.y;
    
    // Use Math.floor for proper grid alignment
    const col = Math.floor(gridX / squareSize);
    const row = Math.floor(gridY / squareSize);
    
    // Map to logical position (3x3 with wrapping)
    // Need to handle negative modulo properly
    const logicalCol = ((col % 3) + 3) % 3;
    const logicalRow = ((row % 3) + 3) % 3;
    const logicalPos = logicalRow * 3 + logicalCol;
    
    console.log('Click:', {clickX, clickY, gridX, gridY, row, col, logicalRow, logicalCol, logicalPos});
    
    makeMove(logicalPos);
  };

  const renderSquare = (visualPos) => {
    const logicalPos = visualToLogical(visualPos);
    const value = board[logicalPos];
    const isWinning = winningLine.includes(logicalPos);
    
    const isCorner = [0, 3, 12, 15].includes(visualPos);
    const isEdge = [1, 2, 4, 7, 8, 11, 13, 14].includes(visualPos);
    
    return (
      <button
        key={visualPos}
        onClick={() => handleClick(visualPos)}
        disabled={isComputerThinking}
        className={`
          w-20 h-20 text-3xl font-bold transition-all
          ${isWinning ? 'bg-green-400 text-white' : isCorner ? 'bg-purple-50' : isEdge ? 'bg-blue-50' : 'bg-white'}
          ${!isWinning && !value && !winner && !isComputerThinking ? 'hover:bg-gray-100' : ''}
          ${value === 'X' ? 'text-blue-600' : 'text-red-600'}
          border border-gray-400
          ${!value && !winner && !isComputerThinking ? 'cursor-pointer' : 'cursor-default'}
          ${isComputerThinking ? 'opacity-70' : ''}
        `}
      >
        {value}
      </button>
    );
  };

  // Render infinite tiling view
  const renderInfiniteView = () => {
    const squareSize = 80;
    
    // Calculate which tiles are visible based on pan offset
    const viewWidth = 600;
    const viewHeight = 600;
    const tileSize = 3 * squareSize; // Each tile is 3x3 squares
    
    // Calculate tile range to render (with extra padding for smooth panning)
    const minTileX = Math.floor((-panOffset.x - viewWidth / 2) / tileSize) - 2;
    const maxTileX = Math.ceil((-panOffset.x + viewWidth / 2) / tileSize) + 2;
    const minTileY = Math.floor((-panOffset.y - viewHeight / 2) / tileSize) - 2;
    const maxTileY = Math.ceil((-panOffset.y + viewHeight / 2) / tileSize) + 2;
    
    const squares = [];
    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
        for (let localRow = 0; localRow < 3; localRow++) {
          for (let localCol = 0; localCol < 3; localCol++) {
            const logicalPos = localRow * 3 + localCol;
            const value = board[logicalPos];
            const isWinning = winningLine.includes(logicalPos);
            
            const x = (tileX * 3 + localCol) * squareSize;
            const y = (tileY * 3 + localRow) * squareSize;
            
            squares.push(
              <g key={`${tileX}-${tileY}-${localRow}-${localCol}`}>
                <rect
                  x={x}
                  y={y}
                  width={squareSize}
                  height={squareSize}
                  fill={isWinning ? '#4ade80' : '#ffffff'}
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
                {value && (
                  <text
                    x={x + squareSize / 2}
                    y={y + squareSize / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="32"
                    fontWeight="bold"
                    fill={value === 'X' ? '#2563eb' : '#dc2626'}
                  >
                    {value}
                  </text>
                )}
              </g>
            );
          }
        }
      }
    }
    
    return squares;
  };

  // Menu screen
  if (gameMode === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Torus Tic-Tac-Toe
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Choose your game mode
          </p>

          <div className="space-y-4">
            <button
              onClick={() => startNewGame('human')}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl text-lg font-semibold"
            >
              <User size={24} />
              Play vs Human
            </button>

            <button
              onClick={() => startNewGame('computer')}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl text-lg font-semibold"
            >
              <Cpu size={24} />
              Play vs Computer
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-500 text-center">
            The board wraps like a donut (torus) in both directions!
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  const isBoardFull = board.every(square => square !== null);
  const status = winner 
    ? `Winner: ${winner}!` 
    : isBoardFull 
    ? "It's a draw!" 
    : isComputerThinking
    ? "Computer is thinking..."
    : `Next player: ${isXNext ? 'X (You)' : gameMode === 'human' ? 'O' : 'O (Computer)'}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Torus Tic-Tac-Toe
        </h1>
        <p className="text-center text-gray-600 mb-4">
          {gameMode === 'human' ? 'Playing vs Human' : 'Playing vs Computer'}
        </p>

        <div className="mb-4 text-center">
          <div className={`text-2xl font-semibold ${winner ? 'text-green-600' : 'text-gray-700'}`}>
            {status}
          </div>
        </div>

        <div className="mb-4 flex justify-center gap-2">
          <button
            onClick={() => setViewMode('compact')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              viewMode === 'compact' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Grid3x3 size={18} />
            Compact View
          </button>
          <button
            onClick={() => setViewMode('infinite')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              viewMode === 'infinite' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Maximize2 size={18} />
            Infinite View
          </button>
        </div>

        {viewMode === 'compact' ? (
          <div className="mb-6 flex justify-center">
            <div className="inline-block">
              <div className="grid grid-cols-4 gap-0 border-4 border-purple-300 rounded-lg overflow-hidden">
                {Array(16).fill(null).map((_, i) => renderSquare(i))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex justify-center">
            <div 
              className="border-4 border-purple-300 rounded-lg overflow-hidden bg-gray-100"
              style={{ width: '600px', height: '600px', cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleInfiniteClick}
            >
              <svg 
                ref={canvasRef}
                width="600" 
                height="600" 
                viewBox="0 0 600 600"
                style={{ overflow: 'visible' }}
              >
                <g transform={`translate(${300 + panOffset.x}, ${300 + panOffset.y})`}>
                  {renderInfiniteView()}
                </g>
              </svg>
            </div>
          </div>
        )}

        {viewMode === 'infinite' && (
          <p className="text-sm text-gray-600 text-center mb-4">
            Click and drag to pan • Click a square to play
          </p>
        )}

        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-3">
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
            >
              <RotateCcw size={20} />
              New Game
            </button>
            
            <button
              onClick={backToMenu}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
            >
              Change Mode
            </button>
          </div>

          <div className="text-sm text-gray-600 max-w-md text-center space-y-2">
            <p className="font-semibold">How it works:</p>
            <p>This 3×3 game has toroidal topology - it wraps both horizontally AND vertically!</p>
            <p className="text-xs">In compact view: 🟪 Purple corners = all the same square | 🔵 Blue edges = paired with opposite edge</p>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.render(<TorusTicTacToe />, document.getElementById('root'));
