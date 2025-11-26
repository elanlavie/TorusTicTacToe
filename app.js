// -----------------------------
// Torus Tic-Tac-Toe (No React)
// -----------------------------

let board = Array(9).fill(null);
let isXNext = true;
let winner = null;
let winningLine = [];
let allLines = [];
let gameMode = null;
let viewMode = "compact";
let isComputerThinking = false;

// Pan/drag state
let infiniteOffset = { x: 0, y: 0 };
let compactOffset = { x: 0, y: 0 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let hasDragged = false;

// References for 3D torus
let torusScene = null;

// -----------------------------
// Generate all toroidal win lines
// -----------------------------
(function generateLines() {
  const lines = new Set();
  for (let start = 0; start < 9; start++) {
    const sr = Math.floor(start / 3);
    const sc = start % 3;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const pos = [];
        for (let step = 0; step < 3; step++) {
          const r = (sr + dx * step + 3) % 3;
          const c = (sc + dy * step + 3) % 3;
          pos.push(r * 3 + c);
        }
        lines.add(pos.slice().sort().join(","));
      }
    }
  }
  allLines = [...lines].map(l => l.split(",").map(Number));
})();

function checkWinner(sq) {
  for (let line of allLines) {
    const [a, b, c] = line;
    if (sq[a] && sq[a] === sq[b] && sq[a] === sq[c]) {
      return { winner: sq[a], line };
    }
  }
  return null;
}

function getComputerMove(b) {
  const empties = b.map((v,i)=>v===null?i:null).filter(i=>i!==null);
  if (!empties.length) return null;

  // Win if possible
  for (let p of empties) {
    const test = [...b];
    test[p] = "O";
    if (checkWinner(test)) return p;
  }

  // Block X if needed
  for (let p of empties) {
    const test = [...b];
    test[p] = "X";
    if (checkWinner(test)) return p;
  }

  // Otherwise random
  return empties[Math.floor(Math.random() * empties.length)];
}

function makeMove(pos) {
  if (board[pos] || winner) return;
  board[pos] = isXNext ? "X" : "O";

  const result = checkWinner(board);
  if (result) {
    winner = result.winner;
    winningLine = result.line;
  } else {
    isXNext = !isXNext;
  }

  render();
}

function resetGame() {
  board = Array(9).fill(null);
  isXNext = true;
  winner = null;
  winningLine = [];
  isComputerThinking = false;
  render();
}


// ---------------------------------------------
// Rendering functions (Compact + Infinite views)
// ---------------------------------------------
function renderCompact(svg, offset) {
  const size = 80;
  const tilesize = 3 * size;
  const viewW = 252, viewH = 252;

  const minX = Math.floor((-offset.x - viewW/2) / tilesize) - 1;
  const maxX = Math.ceil((-offset.x + viewW/2) / tilesize) + 1;
  const minY = Math.floor((-offset.y - viewH/2) / tilesize) - 1;
  const maxY = Math.ceil((-offset.y + viewH/2) / tilesize) + 1;

  let out = "";
  for (let ty=minY; ty<=maxY; ty++) {
    for (let tx=minX; tx<=maxX; tx++) {
      for (let r=0; r<3; r++) {
        for (let c=0; c<3; c++) {
          const pos = r*3 + c;
          const val = board[pos];
          const isWin = winningLine.includes(pos);

          const x = (tx*3 + c) * size;
          const y = (ty*3 + r) * size;

          out += `
            <rect x="${x}" y="${y}" width="${size}" height="${size}" 
              fill="${isWin ? '#4ade80' : '#ffffff'}" 
              stroke="#9ca3af" stroke-width="1" />
          `;

          if (val) {
            out += `
              <text x="${x+size/2}" y="${y+size/2}"
                text-anchor="middle" dominant-baseline="central"
                font-size="32" font-weight="bold"
                fill="${val==='X' ? '#2563eb' : '#dc2626'}">${val}</text>
            `;
          }
        }
      }
    }
  }
  svg.innerHTML = out;
}

function renderInfinite(svg, offset) {
  const size = 80;
  const tilesize = 3 * size;
  const viewW = 600, viewH = 600;

  const minX = Math.floor((-offset.x - viewW/2) / tilesize) - 2;
  const maxX = Math.ceil((-offset.x + viewW/2) / tilesize) + 2;
  const minY = Math.floor((-offset.y - viewH/2) / tilesize) - 2;
  const maxY = Math.ceil((-offset.y + viewH/2) / tilesize) + 2;

  let out = "";
  for (let ty=minY; ty<=maxY; ty++) {
    for (let tx=minX; tx<=maxX; tx++) {
      for (let r=0; r<3; r++) {
        for (let c=0; c<3; c++) {
          const pos = r*3 + c;
          const val = board[pos];
          const isWin = winningLine.includes(pos);

          const x = (tx*3 + c) * size;
          const y = (ty*3 + r) * size;

          out += `
            <rect x="${x}" y="${y}" width="${size}" height="${size}" 
              fill="${isWin ? '#4ade80' : '#ffffff'}" 
              stroke="#9ca3af" stroke-width="1" />
          `;

          if (val) {
            out += `
              <text x="${x+size/2}" y="${y+size/2}"
                text-anchor="middle" dominant-baseline="central"
                font-size="32" font-weight="bold"
                fill="${val==='X' ? '#2563eb' : '#dc2626'}">${val}</text>
            `;
          }
        }
      }
    }
  }
  svg.innerHTML = out;
}


function renderTorus(container) {
  container.innerHTML = "";

  if (!window.THREE) {
    container.innerHTML = "<p class='text-center text-gray-500 p-4'>Three.js failed to load</p>";
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(5, 3, 5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(600,600);
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5,5,5);
  scene.add(dir);

  const R = 2;
  const r = 0.8;
  const geo = new THREE.TorusGeometry(R, r, 16, 32);
  const mat = new THREE.MeshPhongMaterial({ color:0xe0e0e0, transparent:true, opacity:0.3 });
  const torus = new THREE.Mesh(geo, mat);
  scene.add(torus);

  const group = new THREE.Group();
  scene.add(group);

  // Draw squares + X/O
  for (let i=0;i<3;i++){
    for (let j=0;j<3;j++){
      const pos = i*3+j;
      const val = board[pos];
      const isWin = winningLine.includes(pos);

      const u = (j/3) * Math.PI*2;
      const v = (i/3) * Math.PI*2;

      const x = (R + r*Math.cos(v))*Math.cos(u);
      const y = (R + r*Math.cos(v))*Math.sin(u);
      const z = r*Math.sin(v);

      const sqGeo = new THREE.PlaneGeometry(0.4,0.4);
      const sqMat = new THREE.MeshPhongMaterial({
        color: isWin ? 0x4ade80 : 0xffffff,
        side: THREE.DoubleSide
      });
      const square = new THREE.Mesh(sqGeo, sqMat);
      square.position.set(x,y,z);

      const normal = new THREE.Vector3(
        Math.cos(v)*Math.cos(u),
        Math.cos(v)*Math.sin(u),
        Math.sin(v)
      );
      square.lookAt(square.position.clone().add(normal));

      group.add(square);

      if (val) {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = val==="X" ? "#2563eb" : "#dc2626";
        ctx.font = "bold 80px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(val, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(0.35,0.35),
          new THREE.MeshBasicMaterial({ map:texture, transparent:true })
        );
        mesh.position.copy(square.position);
        mesh.position.add(normal.clone().multiplyScalar(0.01));
        mesh.lookAt(mesh.position.clone().add(normal));
        group.add(mesh);
      }
    }
  }

  // Animate
  function animate() {
    requestAnimationFrame(animate);
    torus.rotation.x += 0.002;
    torus.rotation.y += 0.003;
    group.rotation.x += 0.002;
    group.rotation.y += 0.003;
    renderer.render(scene, camera);
  }
  animate();
}


function attachPanHandlers(container, offset, onClickSquare) {

  container.addEventListener("mousedown", e => {
    isDragging = true;
    hasDragged = false;
    dragStart.x = e.clientX - offset.x;
    dragStart.y = e.clientY - offset.y;
  });

  container.addEventListener("mousemove", e => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    offset.x = dx;
    offset.y = dy;

    hasDragged = true;
    render();
  });

  container.addEventListener("mouseup", e => {
    isDragging = false;
  });

  container.addEventListener("mouseleave", e => {
    isDragging = false;
  });

  container.addEventListener("click", e => {
    if (hasDragged) return; // ignore drag-click

    const rect = container.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    onClickSquare(cx, cy);
  });
}

// Main UI
const root = document.getElementById("root");

function render() {
  root.innerHTML = "";

  if (!gameMode) {
    root.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-screen p-8">
        <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 class="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Torus Tic-Tac-Toe</h1>
          <p class="text-center text-gray-600 mb-8">Choose your game mode</p>

          <button id="playHuman" class="w-full mb-4 px-6 py-4 bg-green-500 text-white rounded-lg">Play vs Human</button>
          <button id="playCPU" class="w-full px-6 py-4 bg-blue-500 text-white rounded-lg">Play vs Computer</button>
        </div>
      </div>
    `;

    document.getElementById("playHuman").onclick = () => { gameMode="human"; resetGame(); };
    document.getElementById("playCPU").onclick = () => { gameMode="computer"; resetGame(); };
    return;
  }

  const status = winner
    ? `Winner: ${winner}`
    : board.every(s=>s!==null)
    ? "Draw!"
    : isComputerThinking
    ? "Computer thinking..."
    : `Next Player: ${isXNext ? "X" : "O"}`;

  root.innerHTML = `
    <div class="flex flex-col items-center p-8">
      <h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Torus Tic-Tac-Toe</h1>
      <p class="mb-4 text-gray-700">${status}</p>

      <div class="flex gap-2 mb-4">
        <button id="viewCompact" class="px-4 py-2 rounded-lg ${viewMode==="compact"?'bg-blue-500 text-white':'bg-gray-200'}">Compact</button>
        <button id="viewInfinite" class="px-4 py-2 rounded-lg ${viewMode==="infinite"?'bg-blue-500 text-white':'bg-gray-200'}">Infinite</button>
        <button id="view3d" class="px-4 py-2 rounded-lg ${viewMode==="3d"?'bg-blue-500 text-white':'bg-gray-200'}">3D Torus</button>
      </div>

      <div id="boardContainer" class="border-4 border-purple-300 rounded-lg bg-gray-100 mb-6"></div>

      <button id="resetBtn" class="px-6 py-3 bg-blue-500 text-white rounded-lg mb-2">New Game</button>
      <button id="backBtn" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg">Change Mode</button>
    </div>
  `;

  document.getElementById("viewCompact").onclick = () => { viewMode="compact"; render(); };
  document.getElementById("viewInfinite").onclick = () => { viewMode="infinite"; render(); };
  document.getElementById("view3d").onclick = () => { viewMode="3d"; render(); };

  document.getElementById("resetBtn").onclick = resetGame;
  document.getElementById("backBtn").onclick = () => { gameMode=null; resetGame(); };

  const container = document.getElementById("boardContainer");

  if (viewMode === "compact") {
    container.style.width = "252px";
    container.style.height = "252px";

    container.innerHTML = `<svg id="compactSVG" width="252" height="252"></svg>`;
    const svg = document.getElementById("compactSVG");

    const onClick = (cx, cy) => {
      const col = Math.floor((cx - 126 - compactOffset.x)/80);
      const row = Math.floor((cy - 126 - compactOffset.y)/80);
      const r = ((row % 3) + 3) % 3;
      const c = ((col % 3) + 3) % 3;
      makeMove(r*3 + c);
    };

    attachPanHandlers(container, compactOffset, onClick);
    renderCompact(svg, compactOffset);
  }

  else if (viewMode === "infinite") {
    container.style.width = "600px";
    container.style.height = "600px";

    container.innerHTML = `<svg id="infiniteSVG" width="600" height="600"></svg>`;
    const svg = document.getElementById("infiniteSVG");

    const onClick = (cx, cy) => {
      const col = Math.floor((cx - 300 - infiniteOffset.x)/80);
      const row = Math.floor((cy - 300 - infiniteOffset.y)/80);
      const r = ((row % 3) + 3) % 3;
      const c = ((col % 3) + 3) % 3;
      makeMove(r*3 + c);
    };

    attachPanHandlers(container, infiniteOffset, onClick);
    renderInfinite(svg, infiniteOffset);
  }

  else if (viewMode === "3d") {
    container.style.width = "600px";
    container.style.height = "600px";
    renderTorus(container);
  }
}

render(); // Initial UI
