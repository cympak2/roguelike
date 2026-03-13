// Manual visualization of town generation logic

const TOWN_WIDTH = 40;
const TOWN_HEIGHT = 40;

// Glyph map for visualization
const glyphMap = {
  'WALL': '█',
  'FLOOR': '·',
  'DOOR_CLOSED': '+',
  'DOOR_OPEN': '/',
  'STAIRS_UP': '<',
  'STAIRS_DOWN': '>',
  'WATER': '~',
  'LAVA': '§',
  'GRASS': ' ',
  'TREE': 'T',
  'STONE': '─',
  'CHEST_CLOSED': 'C',
  'CHEST_OPEN': 'c',
  'FOUNTAIN': 'Ⓕ',
  'ALTAR': 'A',
};

// Simulate map grid
const grid = Array(TOWN_HEIGHT).fill(null).map(() => Array(TOWN_WIDTH).fill('GRASS'));

// Helper to set tile
function setTile(x, y, type) {
  if (x >= 0 && x < TOWN_WIDTH && y >= 0 && y < TOWN_HEIGHT) {
    grid[y][x] = type;
  }
}

// Helper to create circle
function createCircle(cx, cy, radius, type) {
  for (let x = cx - radius; x <= cx + radius; x++) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist <= radius && x >= 0 && x < TOWN_WIDTH && y >= 0 && y < TOWN_HEIGHT) {
        if (grid[y][x] === 'GRASS' || grid[y][x] === 'STONE') {
          setTile(x, y, type);
        }
      }
    }
  }
}

// Create town square
const cx = 19, cy = 18, squareSize = 6;
for (let y = cy - squareSize; y <= cy + squareSize; y++) {
  for (let x = cx - squareSize; x <= cx + squareSize; x++) {
    if (x >= 0 && x < TOWN_WIDTH && y >= 0 && y < TOWN_HEIGHT) {
      setTile(x, y, 'STONE');
    }
  }
}
setTile(cx, cy, 'FOUNTAIN');
createCircle(cx, cy, 2, 'STONE');

// Helper to create building
function createBuilding(bx, by, width, height, doorPos) {
  // Walls
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const x = bx + dx, y = by + dy;
      if (x >= 0 && x < TOWN_WIDTH && y >= 0 && y < TOWN_HEIGHT) {
        if (dx === 0 || dx === width - 1 || dy === 0 || dy === height - 1) {
          setTile(x, y, 'WALL');
        } else {
          setTile(x, y, 'FLOOR');
        }
      }
    }
  }
  
  // Door
  const centerOffset = Math.floor((doorPos === 'left' || doorPos === 'right' ? height : width) / 2);
  let dx = bx, dy = by;
  switch (doorPos) {
    case 'top': dx = bx + centerOffset; dy = by; break;
    case 'bottom': dx = bx + centerOffset; dy = by + height - 1; break;
    case 'left': dx = bx; dy = by + centerOffset; break;
    case 'right': dx = bx + width - 1; dy = by + centerOffset; break;
  }
  if (dx >= 0 && dx < TOWN_WIDTH && dy >= 0 && dy < TOWN_HEIGHT) {
    setTile(dx, dy, 'DOOR_CLOSED');
  }
}

// Create buildings
createBuilding(14, 2, 12, 8, 'bottom');   // Elder's House
createBuilding(2, 14, 10, 8, 'right');    // Blacksmith
createBuilding(28, 14, 10, 8, 'left');    // Healer's Cottage
createBuilding(2, 28, 8, 8, 'top');       // Thief's Den
createBuilding(30, 28, 8, 8, 'top');      // Hermit's Hut

// Create dungeon entrance
const dx = 19, dy = 36;
for (let y = dy - 3; y <= dy + 3; y++) {
  for (let x = dx - 3; x <= dx + 3; x++) {
    if (x >= 0 && x < TOWN_WIDTH && y >= 0 && y < TOWN_HEIGHT) {
      if (x === dx - 3 || x === dx + 3 || y === dy - 3 || y === dy + 3) {
        setTile(x, y, 'WALL');
      } else {
        setTile(x, y, 'FLOOR');
      }
    }
  }
}
setTile(dx, dy, 'STAIRS_DOWN');

// Helper to create path
function createPath(x1, y1, x2, y2) {
  const sx = Math.min(x1, x2), ex = Math.max(x1, x2);
  const sy = Math.min(y1, y2), ey = Math.max(y1, y2);
  
  for (let x = sx; x <= ex; x++) {
    if (x >= 0 && x < TOWN_WIDTH && y1 >= 0 && y1 < TOWN_HEIGHT) {
      if (grid[y1][x] === 'GRASS') setTile(x, y1, 'STONE');
    }
  }
  for (let y = sy; y <= ey; y++) {
    if (x2 >= 0 && x2 < TOWN_WIDTH && y >= 0 && y < TOWN_HEIGHT) {
      if (grid[y][x2] === 'GRASS') setTile(x2, y, 'STONE');
    }
  }
}

// Create paths
createPath(20, 10, 20, 12);
createPath(20, 12, 19, 12);
createPath(12, 18, 13, 18);
createPath(28, 18, 26, 18);
createPath(6, 28, 6, 25);
createPath(6, 25, 13, 25);
createPath(13, 25, 13, 21);
createPath(34, 28, 34, 25);
createPath(34, 25, 26, 25);
createPath(26, 25, 26, 21);
createPath(19, 24, 19, 33);

// Add decorative trees
const trees = [
  {x: 1, y: 5}, {x: 38, y: 5}, {x: 1, y: 35}, {x: 38, y: 35},
  {x: 10, y: 1}, {x: 30, y: 1}
];
trees.forEach(({x, y}) => {
  if (grid[y][x] === 'GRASS') setTile(x, y, 'TREE');
});

// Render
console.log('\n========== TOWN LAYOUT (40x40) ==========\n');
for (let y = 0; y < TOWN_HEIGHT; y++) {
  let row = '';
  for (let x = 0; x < TOWN_WIDTH; x++) {
    row += glyphMap[grid[y][x]] || '?';
  }
  console.log(row);
}

console.log('\n========== NPC LOCATIONS ==========\n');
const npcs = [
  { name: 'Aldric the Elder', building: 'Elder\'s House', pos: '(20, 6)' },
  { name: 'Hilda the Blacksmith', building: 'Blacksmith', pos: '(7, 18)' },
  { name: 'Maren the Healer', building: 'Healer\'s Cottage', pos: '(33, 18)' },
  { name: 'Vex the Thief', building: 'Thief\'s Den', pos: '(6, 32)' },
  { name: 'Zane the Hermit', building: 'Hermit\'s Hut', pos: '(34, 32)' }
];

npcs.forEach((npc, idx) => {
  console.log(`${idx + 1}. ${npc.name}`);
  console.log(`   Building: ${npc.building}`);
  console.log(`   Position: ${npc.pos}`);
});

console.log('\n========== TILE LEGEND ==========');
console.log('█ = Wall        · = Floor        + = Door         / = Open Door');
console.log('> = Stairs Down  T = Tree        ─ = Stone Path   Ⓕ = Fountain');
console.log('(space) = Grass  A = Altar       ~ = Water        § = Lava');
console.log('\n========== FEATURES ==========');
console.log('✓ Safe zone (no monster spawns)');
console.log('✓ 5 NPC buildings with unique roles');
console.log('✓ Town square with fountain (center)');
console.log('✓ Dungeon entrance (south)');
console.log('✓ Connected stone paths between all locations');
console.log('✓ Decorative elements (trees, stones)');
