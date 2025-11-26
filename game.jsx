
const { useState, useEffect, useRef } = React;
const { RotateCcw, User, Cpu, Grid3x3, Maximize2, Box } = lucide;

export default function TorusTicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState([]);
  const [allLines, setAllLines] = useState([]);
  const [gameMode, setGameMode] = useState(null);
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [viewMode, setViewMode] = useState('compact');
  const [infinitePanOffset, setInfinitePanOffset] = useState({ x: 0, y: 0 });
  const [compactPanOffset, setCompactPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const canvasRef = useRef(null);
  const compactCanvasRef = useRef(null);
  const torusContainerRef = useRef(null);
  const torusSceneRef = useRef(null);

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

  useEffect(() => {
    if (viewMode !== '3d' || !torusContainerRef.current) return;
    
    const THREE = window.THREE;
    if (!THREE) {
      console.log('Three.js not available');
      return;
    }

    while (torusContainerRef.current.firstChild) {
      torusContainerRef.current.removeChild(torusContainerRef.current.firstChild);
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f4f8);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(5, 3, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(600, 600);
    torusContainerRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const torusGeometry = new THREE.TorusGeometry(2, 0.8, 16, 32);
    const torusMaterial = new THREE.MeshPhongMaterial({
      color: 0xe0e0e0,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const torusMesh = new THREE.Mesh(torusGeometry, torusMaterial);
    scene.add(torusMesh);

    torusSceneRef.current = {
      scene,
      camera,
      renderer,
      torusMesh,
      gridGroup: new THREE.Group()
    };
    
    scene.add(torusSceneRef.current.gridGroup);

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      torusMesh.rotation.x += 0.002;
      torusMesh.rotation.y += 0.003;
      if (torusSceneRef.current.gridGroup) {
        torusSceneRef.current.gridGroup.rotation.x += 0.002;
        torusSceneRef.current.gridGroup.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      if (torusContainerRef.current && renderer.domElement) {
        torusContainerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      torusSceneRef.current = null;
    };
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== '3d' || !torusSceneRef.current) return;
    
    const THREE = window.THREE;
    if (!THREE) return;

    const { scene, gridGroup } = torusSceneRef.current;
    
    while (gridGroup.children.length > 0) {
      const child = gridGroup.children[0];
      gridGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    }

    const R = 2;
    const r = 0.8;

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const logicalPos = i * 3 + j;
        const value = board[logicalPos];
        const isWinning = winningLine.includes(logicalPos);

        const u = (j / 3) * Math.PI * 2;
        const v = (i / 3) * Math.PI * 2;

        const x = (R + r * Math.cos(v)) * Math.cos(u);
        const y = (R + r * Math.cos(v)) * Math.sin(u);
        const z = r * Math.sin(v);

        const squareGeometry = new THREE.PlaneGeometry(0.4, 0.4);
        const squareMaterial = new THREE.MeshPhongMaterial({
          color: isWinning ? 0x4ade80 : 0xffffff,
          side: THREE.DoubleSide
        });
        const square = new THREE.Mesh(squareGeometry, squareMaterial);
        
        square.position.set(x, y, z);
        
        const normal = new THREE.Vector3(
          Math.cos(v) * Math.cos(u),
          Math.cos(v) * Math.sin(u),
          Math.sin(v)
        );
        square.lookAt(square.position.clone().add(normal));
        
        gridGroup.add(square);

        if (value) {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = 128;
          canvas.height = 128;
          context.fillStyle = value === 'X' ? '#2563eb' : '#dc2626';
          context.font = 'bold 80px Arial';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(value, 64, 64);

          const texture = new THREE.CanvasTexture(canvas);
          const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
          });
          const textMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.35, 0.35),
            textMaterial
          );
          textMesh.position.copy(square.position);
          textMesh.position.add(normal.multiplyScalar(0.01));
          textMesh.lookAt(textMesh.position.clone().add(normal));
          gridGroup.add(textMesh);
        }
      }
    }
  }, [board, winningLine, viewMode]);

  const checkWinner = (squares) => {
    for (let line of allLines) {
      const [a, b, c] = line;
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line };
      }
    }
    return null;
  };

  const getComputerMove = (currentBoard) => {
    const emptyPositions = currentBoard
      .map((val, idx) => val === null ? idx : null)
      .filter(val => val !== null);

    if (emptyPositions.length === 0) return null;

    for (let pos of emptyPositions) {
      const testBoard = [...currentBoard];
      testBoard[pos] = 'O';
      if (checkWinner(testBoard)) {
        return pos;
      }
    }

    for (let pos of emptyPositions) {
      const testBoard = [...currentBoard];
      testBoard[pos] = 'X';
      if (checkWinner(testBoard)) {
        return pos;
      }
    }

    let bestMove = null;
    let maxThreats = 0;
    
    for (let pos of emptyPositions) {
      const testBoard = [...currentBoard];
      testBoard[pos] = 'O';
      
      let threats = 0;
      for (let nextPos of emptyPositions) {
        if (nextPos === pos) continue;
        const nextTestBoard = [...testBoard];
        nextTestBoard[nextPos] = 'O';
        if (checkWinner(nextTestBoard)) {
          threats++;
        }
      }
      
      if (threats > maxThreats) {
        maxThreats = threats;
        bestMove = pos;
      }
    }
    
    if (bestMove !== null && maxThreats > 0) {
      return bestMove;
    }

    for (let pos of emptyPositions) {
      const testBoard = [...currentBoard];
      testBoard[pos] = 'X';
      
      let opponentThreats = 0;
      for (let nextPos of emptyPositions) {
        if (nextPos === pos) continue;
        const nextTestBoard = [...testBoard];
        nextTestBoard[nextPos] = 'X';
        if (checkWinner(nextTestBoard)) {
          opponentThreats++;
        }
      }
      
      if (opponentThreats >= 2) {
        return pos;
      }
    }

    return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
  };

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
    setInfinitePanOffset({ x: 0, y: 0 });
    setCompactPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setHasDragged(false);
    const currentOffset = viewMode === 'infinite' ? infinitePanOffset : compactPanOffset;
    setDragStart({ x: e.clientX - currentOffset.x, y: e.clientY - currentOffset.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const currentOffset = viewMode === 'infinite' ? infinitePanOffset : compactPanOffset;
      const movedX = Math.abs(e.clientX - dragStart.x - currentOffset.x);
      const movedY = Math.abs(e.clientY - dragStart.y - currentOffset.y);
      
      if (movedX > 5 || movedY > 5) {
        setHasDragged(true);
      }
      
      const newOffset = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      
      if (viewMode === 'infinite') {
        setInfinitePanOffset(newOffset);
      } else {
        setCompactPanOffset(newOffset);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = (e, isCompact = false) => {
    if (hasDragged) return;
    
    const canvas = isCompact ? compactCanvasRef.current : canvasRef.current;
    const panOffset = isCompact ? compactPanOffset : infinitePanOffset;
    const rect = canvas.getBoundingClientRect();
    const squareSize = 80;
    
    const centerOffset = isCompact ? 126 : 300;
    const clickX = e.clientX - rect.left - centerOffset;
    const clickY = e.clientY - rect.top - centerOffset;
    
    const gridX = clickX - panOffset.x;
    const gridY = clickY - panOffset.y;
    
    const col = Math.floor(gridX / squareSize);
    const row = Math.floor(gridY / squareSize);
    
    const logicalCol = ((col % 3) + 3) % 3;
    const logicalRow = ((row % 3) + 3) % 3;
    const logicalPos = logicalRow * 3 + logicalCol;
    
    makeMove(logicalPos);
  };

  const renderCompactView = () => {
    const squareSize = 80;
    const squares = [];
    
    const viewWidth = 252;
    const viewHeight = 252;
    const tileSize = 3 * squareSize;
    
    const minTileX = Math.floor((-compactPanOffset.x - viewWidth / 2) / tileSize) - 1;
    const maxTileX = Math.ceil((-compactPanOffset.x + viewWidth / 2) / tileSize) + 1;
    const minTileY = Math.floor((-compactPanOffset.y - viewHeight / 2) / tileSize) - 1;
    const maxTileY = Math.ceil((-compactPanOffset.y + viewHeight / 2) / tileSize) + 1;
    
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

  const renderInfiniteView = () => {
    const squareSize = 80;
    const viewWidth = 600;
    const viewHeight = 600;
    const tileSize = 3 * squareSize;
    
    const minTileX = Math.floor((-infinitePanOffset.x - viewWidth / 2) / tileSize) - 2;
    const maxTileX = Math.ceil((-infinitePanOffset.x + viewWidth / 2) / tileSize) + 2;
    const minTileY = Math.floor((-infinitePanOffset.y - viewHeight / 2) / tileSize) - 2;
    const maxTileY = Math.ceil((-infinitePanOffset.y + viewHeight / 2) / tileSize) + 2;
    
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
            Compact
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
            Infinite
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              viewMode === '3d' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Box size={18} />
            3D Torus
          </button>
        </div>

        {viewMode === 'compact' ? (
          <div className="mb-6 flex justify-center">
            <div 
              className="border-4 border-purple-300 rounded-lg overflow-hidden bg-gray-100"
              style={{ width: '252px', height: '252px', cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={(e) => handleCanvasClick(e, true)}
            >
              <svg 
                ref={compactCanvasRef}
                width="252" 
                height="252" 
                viewBox="0 0 252 252"
                style={{ overflow: 'visible' }}
              >
                <g transform={`translate(${126 + compactPanOffset.x}, ${126 + compactPanOffset.y})`}>
                  {renderCompactView()}
                </g>
              </svg>
            </div>
          </div>
        ) : viewMode === 'infinite' ? (
          <div className="mb-6 flex justify-center">
            <div 
              className="border-4 border-purple-300 rounded-lg overflow-hidden bg-gray-100"
              style={{ width: '600px', height: '600px', cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={(e) => handleCanvasClick(e, false)}
            >
              <svg 
                ref={canvasRef}
                width="600" 
                height="600" 
                viewBox="0 0 600 600"
                style={{ overflow: 'visible' }}
              >
                <g transform={`translate(${300 + infinitePanOffset.x}, ${300 + infinitePanOffset.y})`}>
                  {renderInfiniteView()}
                </g>
              </svg>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex justify-center">
            <div 
              ref={torusContainerRef}
              className="border-4 border-purple-300 rounded-lg overflow-hidden flex items-center justify-center"
              style={{ width: '600px', height: '600px', background: 'linear-gradient(to bottom right, #f9fafb, #e5e7eb)' }}
            >
              {!window.THREE && (
                <div className="text-center p-8">
                  <p className="text-gray-600 mb-2">3D view requires Three.js</p>
                  <p className="text-sm text-gray-500">This feature is not available in the current environment</p>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'compact' && (
          <p className="text-sm text-gray-600 text-center mb-4">
            This is a 3×3 board that tiles infinitely • Drag to see how it wraps!
          </p>
        )}

        {viewMode === 'infinite' && (
          <p className="text-sm text-gray-600 text-center mb-4">
            Click and drag to pan • Click a square to play
          </p>
        )}

        {viewMode === '3d' && (
          <p className="text-sm text-gray-600 text-center mb-4">
            Watch the rotating 3D torus • The 9 squares wrap around the donut shape
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
            <p className="text-xs">Each square represents the same position across all tiles due to wrapping</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<TorusTicTacToe />);
