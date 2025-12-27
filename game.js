// ========================================
// MOTHERLOAD - Mining Game
// ========================================

// Constants
const BLOCK_SIZE = 20;
const WORLD_WIDTH = 60;
const WORLD_HEIGHT = 200;
const SURFACE_LEVEL = 5;
const VICTORY_DEPTH = 180;

// Mineral types
const MINERALS = {
    DIRT: { name: 'Dirt', color: '#654321', value: 1, weight: 1, rarity: 1.0 },
    COAL: { name: 'Coal', color: '#333333', value: 5, weight: 2, rarity: 0.3 },
    COPPER: { name: 'Copper', color: '#B87333', value: 15, weight: 3, rarity: 0.15 },
    IRON: { name: 'Iron', color: '#808080', value: 30, weight: 4, rarity: 0.1 },
    SILVER: { name: 'Silver', color: '#C0C0C0', value: 75, weight: 5, rarity: 0.05 },
    GOLD: { name: 'Gold', color: '#FFD700', value: 150, weight: 6, rarity: 0.02 },
    DIAMOND: { name: 'Diamond', color: '#00FFFF', value: 500, weight: 3, rarity: 0.005 },
    ALIEN: { name: 'Alien Artifact', color: '#FF00FF', value: 1000, weight: 2, rarity: 0.001 }
};

// Block types
const BLOCK_TYPES = {
    AIR: 0,
    SOFT_EARTH: 1,
    HARD_ROCK: 2,
    VERY_HARD: 3,
    UNBREAKABLE: 4
};

// ========================================
// PARTICLE SYSTEM
// ========================================
class Particle {
    constructor(x, y, color, vx, vy, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05; // Gravity
        this.life--;
    }

    render(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(screenX, screenY, 2, 2);
        ctx.globalAlpha = 1;
    }
}

// ========================================
// AUDIO SYSTEM
// ========================================
class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initAudio();
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    }

    playSound(frequency, duration, type = 'sine') {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playDrill() {
        this.playSound(100 + Math.random() * 50, 0.1, 'sawtooth');
    }

    playCollect() {
        this.playSound(400, 0.1, 'sine');
    }

    playBomb() {
        this.playSound(50, 0.3, 'sawtooth');
    }

    playWarning() {
        this.playSound(800, 0.1, 'square');
    }
}

// ========================================
// GAME STATE
// ========================================
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 800;
        this.height = 600;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.world = null;
        this.player = null;
        this.camera = { x: 0, y: 0 };
        this.keys = {};
        this.running = false;
        this.inShop = false;
        this.gameOver = false;
        this.victory = false;
        this.particles = [];
        this.audio = new AudioSystem();
        this.lastWarningTime = 0;

        this.setupEventListeners();
        this.checkSaveGame();
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (this.inShop && e.key === 'Escape') {
                this.closeShop();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Menu buttons
        const newGameBtn = document.getElementById('new-game-btn');
        const continueBtn = document.getElementById('continue-btn');
        if (newGameBtn) newGameBtn.addEventListener('click', () => this.newGame());
        if (continueBtn) continueBtn.addEventListener('click', () => this.continueGame());

        // Shop buttons
        const closeShopBtn = document.getElementById('close-shop-btn');
        const sellCargoBtn = document.getElementById('sell-cargo-btn');
        const repairHullBtn = document.getElementById('repair-hull-btn');
        const refuelBtn = document.getElementById('refuel-btn');

        if (closeShopBtn) closeShopBtn.addEventListener('click', () => this.closeShop());
        if (sellCargoBtn) sellCargoBtn.addEventListener('click', () => this.sellCargo());
        if (repairHullBtn) repairHullBtn.addEventListener('click', () => this.repairHull());
        if (refuelBtn) refuelBtn.addEventListener('click', () => this.refuel());

        // Game over buttons
        const restartBtn = document.getElementById('restart-btn');
        const newGameVictoryBtn = document.getElementById('new-game-victory-btn');
        if (restartBtn) restartBtn.addEventListener('click', () => this.newGame());
        if (newGameVictoryBtn) newGameVictoryBtn.addEventListener('click', () => this.newGame());
    }

    checkSaveGame() {
        const saveData = localStorage.getItem('motherload-save');
        if (saveData) {
            document.getElementById('continue-btn').style.display = 'inline-block';
        }
    }

    newGame() {
        this.world = new World();
        this.player = new Player(WORLD_WIDTH / 2, SURFACE_LEVEL + 10); // Start underground
        this.gameOver = false;
        this.victory = false;
        this.running = true;

        document.getElementById('start-menu').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        document.getElementById('game-over-overlay').style.display = 'none';
        document.getElementById('victory-overlay').style.display = 'none';

        this.gameLoop();
    }

    continueGame() {
        const saveData = JSON.parse(localStorage.getItem('motherload-save'));
        if (saveData) {
            this.world = new World();
            this.world.loadFromSave(saveData.world);
            this.player = new Player();
            this.player.loadFromSave(saveData.player);
            this.gameOver = false;
            this.victory = false;
            this.running = true;

            document.getElementById('start-menu').style.display = 'none';
            document.getElementById('game-screen').style.display = 'block';

            this.gameLoop();
        }
    }

    saveGame() {
        const saveData = {
            world: this.world.getSaveData(),
            player: this.player.getSaveData()
        };
        localStorage.setItem('motherload-save', JSON.stringify(saveData));
    }

    gameLoop() {
        if (!this.running || this.gameOver || this.victory) return;

        this.update();
        this.render();
        this.updateUI();

        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (this.inShop) return;

        this.player.update(this.keys, this.world, this);

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Check for surface landing - only open shop if player is on surface AND not moving much
        const speed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
        if (this.player.y <= SURFACE_LEVEL - 1 && speed < 0.2 && !this.inShop) {
            this.openShop();
        }

        // Check for game over
        if (this.player.fuel <= 0) {
            this.triggerGameOver('OUT OF FUEL');
        } else if (this.player.hull <= 0) {
            this.triggerGameOver('VEHICLE DESTROYED');
        }

        // Check for victory
        if (this.player.y > VICTORY_DEPTH && !this.victory) {
            this.triggerVictory();
        }

        // Update camera
        this.camera.x = this.player.x * BLOCK_SIZE - this.width / 2;
        this.camera.y = this.player.y * BLOCK_SIZE - this.height / 2;

        // Save game periodically
        if (Math.random() < 0.01) {
            this.saveGame();
        }
    }

    spawnParticles(x, y, color, count = 5) {
        for (let i = 0; i < count; i++) {
            const vx = (Math.random() - 0.5) * 2;
            const vy = (Math.random() - 0.5) * 2 - 1;
            this.particles.push(new Particle(x * BLOCK_SIZE, y * BLOCK_SIZE, color, vx, vy, 30));
        }
    }

    render() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Render world
        this.world.render(this.ctx, this.camera);

        // Render particles
        this.particles.forEach(particle => particle.render(this.ctx, this.camera));

        // Render player
        this.player.render(this.ctx, this.camera);
    }

    updateUI() {
        // Fuel bar
        const fuelPercent = (this.player.fuel / this.player.maxFuel) * 100;
        document.getElementById('fuel-bar').style.width = fuelPercent + '%';
        document.getElementById('fuel-text').textContent =
            `${Math.floor(this.player.fuel)}/${this.player.maxFuel}`;
        if (fuelPercent < 20) {
            document.getElementById('fuel-bar').classList.add('warning');
        } else {
            document.getElementById('fuel-bar').classList.remove('warning');
        }

        // Hull bar
        const hullPercent = (this.player.hull / this.player.maxHull) * 100;
        document.getElementById('hull-bar').style.width = hullPercent + '%';
        document.getElementById('hull-text').textContent =
            `${Math.floor(this.player.hull)}/${this.player.maxHull}`;

        // Heat bar
        const heatPercent = (this.player.heat / this.player.maxHeat) * 100;
        document.getElementById('heat-bar').style.width = heatPercent + '%';
        document.getElementById('heat-text').textContent =
            `${Math.floor(this.player.heat)}/${this.player.maxHeat}`;
        if (heatPercent > 80) {
            document.getElementById('heat-bar').classList.add('warning');
        } else {
            document.getElementById('heat-bar').classList.remove('warning');
        }

        // Cargo bar
        const cargoPercent = (this.player.cargoWeight / this.player.maxCargo) * 100;
        document.getElementById('cargo-bar').style.width = cargoPercent + '%';
        document.getElementById('cargo-text').textContent =
            `${Math.floor(this.player.cargoWeight)}/${this.player.maxCargo}`;

        // Money
        document.getElementById('money-value').textContent = this.player.money;

        // Depth
        const depth = Math.max(0, Math.floor((this.player.y - SURFACE_LEVEL) * 5));
        document.getElementById('depth-value').textContent = depth + 'm';

        // Bombs
        document.getElementById('bombs-value').textContent = this.player.bombs;

        // Warnings
        this.updateWarnings();
    }

    updateWarnings() {
        const warningsContainer = document.getElementById('warnings-container');
        warningsContainer.innerHTML = '';

        const now = Date.now();
        let shouldPlayWarning = false;

        // Low fuel warning
        if (this.player.fuel < 20 && this.player.fuel > 0) {
            const warning = document.createElement('div');
            warning.className = 'warning-message';
            warning.textContent = '⚠️ LOW FUEL ⚠️';
            warningsContainer.appendChild(warning);
            shouldPlayWarning = true;
        }

        // Cargo full warning
        if (this.player.cargoWeight >= this.player.maxCargo * 0.9) {
            const warning = document.createElement('div');
            warning.className = 'warning-message';
            warning.textContent = '⚠️ CARGO FULL ⚠️';
            warning.style.background = 'rgba(255, 165, 0, 0.8)';
            warning.style.borderColor = '#ff9900';
            warningsContainer.appendChild(warning);
        }

        // Overheat warning
        if (this.player.heat >= this.player.maxHeat * 0.8) {
            const warning = document.createElement('div');
            warning.className = 'warning-message';
            warning.textContent = '⚠️ OVERHEATING ⚠️';
            warningsContainer.appendChild(warning);
            shouldPlayWarning = true;
        }

        // Play warning sound occasionally
        if (shouldPlayWarning && now - this.lastWarningTime > 2000) {
            this.audio.playWarning();
            this.lastWarningTime = now;
        }
    }

    openShop() {
        this.inShop = true;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.y = SURFACE_LEVEL - 2;
        this.player.isOnSurface = true;

        // Cool down heat when on surface
        this.player.heat = Math.max(0, this.player.heat - 30);

        // Restock bombs
        this.player.bombs = this.player.maxBombs;

        document.getElementById('shop-overlay').style.display = 'flex';
        this.updateShopUI();
    }

    closeShop() {
        this.inShop = false;
        this.player.isOnSurface = false;
        document.getElementById('shop-overlay').style.display = 'none';
        this.saveGame();
    }

    updateShopUI() {
        // Update service costs
        const repairCost = Math.ceil((this.player.maxHull - this.player.hull) * 2);
        document.getElementById('repair-cost').textContent = repairCost;
        document.getElementById('repair-hull-btn').disabled =
            repairCost === 0 || this.player.money < repairCost;

        const refuelCost = Math.ceil((this.player.maxFuel - this.player.fuel) * 0.5);
        document.getElementById('refuel-cost').textContent = refuelCost;
        document.getElementById('refuel-btn').disabled =
            refuelCost === 0 || this.player.money < refuelCost;

        document.getElementById('sell-cargo-btn').disabled = this.player.cargo.length === 0;

        // Update upgrades
        this.renderUpgrades();
    }

    renderUpgrades() {
        const upgradesList = document.getElementById('upgrades-list');
        upgradesList.innerHTML = '';

        this.player.availableUpgrades.forEach(upgrade => {
            const btn = document.createElement('button');
            btn.className = 'shop-btn';

            const level = this.player.upgrades[upgrade.id] || 0;
            const cost = upgrade.baseCost * Math.pow(2, level);
            const canAfford = this.player.money >= cost;

            if (level >= upgrade.maxLevel) {
                btn.disabled = true;
                btn.classList.add('disabled');
                btn.innerHTML = `${upgrade.name} - MAX LEVEL`;
            } else {
                btn.disabled = !canAfford;
                if (!canAfford) btn.classList.add('disabled');
                btn.innerHTML = `${upgrade.name} Lv.${level + 1} - $${cost}<br>
                    <small style="color: #888">${upgrade.description}</small>`;
                btn.addEventListener('click', () => this.buyUpgrade(upgrade.id));
            }

            upgradesList.appendChild(btn);
        });
    }

    sellCargo() {
        let totalValue = 0;
        this.player.cargo.forEach(mineral => {
            totalValue += mineral.value;
        });

        this.player.money += totalValue;
        this.player.cargo = [];
        this.player.cargoWeight = 0;
        this.updateShopUI();
    }

    repairHull() {
        const repairCost = Math.ceil((this.player.maxHull - this.player.hull) * 2);
        if (this.player.money >= repairCost) {
            this.player.money -= repairCost;
            this.player.hull = this.player.maxHull;
            this.updateShopUI();
        }
    }

    refuel() {
        const refuelCost = Math.ceil((this.player.maxFuel - this.player.fuel) * 0.5);
        if (this.player.money >= refuelCost) {
            this.player.money -= refuelCost;
            this.player.fuel = this.player.maxFuel;
            this.updateShopUI();
        }
    }

    buyUpgrade(upgradeId) {
        const upgrade = this.player.availableUpgrades.find(u => u.id === upgradeId);
        const level = this.player.upgrades[upgradeId] || 0;
        const cost = upgrade.baseCost * Math.pow(2, level);

        if (this.player.money >= cost && level < upgrade.maxLevel) {
            this.player.money -= cost;
            this.player.upgrades[upgradeId] = level + 1;
            this.player.applyUpgrades();
            this.audio.playCollect();
            this.updateShopUI();
        }
    }

    triggerGameOver(reason) {
        this.gameOver = true;
        this.running = false;
        document.getElementById('game-over-reason').textContent = reason;
        document.getElementById('final-depth').textContent =
            Math.max(0, Math.floor((this.player.y - SURFACE_LEVEL) * 5));
        document.getElementById('final-money').textContent = this.player.money;
        document.getElementById('game-over-overlay').style.display = 'flex';
        localStorage.removeItem('motherload-save');
    }

    triggerVictory() {
        this.victory = true;
        this.running = false;
        document.getElementById('victory-message').textContent =
            "You've discovered the ancient alien civilization buried at the planet's core. " +
            "The secrets you've uncovered will change everything...";
        document.getElementById('victory-overlay').style.display = 'flex';
        localStorage.removeItem('motherload-save');
    }
}

// ========================================
// PLAYER CLASS
// ========================================
class Player {
    constructor(x = WORLD_WIDTH / 2, y = SURFACE_LEVEL + 10) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;

        // Base stats
        this.fuel = 100;
        this.maxFuel = 100;
        this.hull = 100;
        this.maxHull = 100;
        this.heat = 0;
        this.maxHeat = 100;
        this.cargo = [];
        this.cargoWeight = 0;
        this.maxCargo = 50;

        this.money = 50; // Starting money for first upgrade
        this.upgrades = {};
        this.isOnSurface = false;

        // Movement stats (affected by upgrades)
        this.speed = 0.1;
        this.drillPower = 1;
        this.cooling = 0.5;
        this.bombs = 3;
        this.maxBombs = 3;

        this.availableUpgrades = [
            { id: 'drill', name: 'Drill Power', description: 'Mine harder blocks (required for deep mining)', baseCost: 100, maxLevel: 5 },
            { id: 'cargo', name: 'Cargo Bay', description: 'Carry more minerals', baseCost: 50, maxLevel: 5 },
            { id: 'fuel_tank', name: 'Fuel Tank', description: 'More fuel capacity', baseCost: 80, maxLevel: 5 },
            { id: 'engine', name: 'Engine', description: 'Faster movement', baseCost: 60, maxLevel: 5 },
            { id: 'hull', name: 'Hull Armor', description: 'More durability', baseCost: 90, maxLevel: 5 },
            { id: 'cooling', name: 'Cooling System', description: 'Essential for deep mining', baseCost: 150, maxLevel: 5 },
            { id: 'bombs', name: 'Bomb Capacity', description: 'Carry more bombs', baseCost: 120, maxLevel: 3 }
        ];
    }

    update(keys, world, game) {
        // Apply gravity
        this.vy += 0.02;

        // Handle input with momentum
        if (keys['ArrowLeft']) {
            this.vx -= this.speed;
        }
        if (keys['ArrowRight']) {
            this.vx += this.speed;
        }
        if (keys['ArrowUp']) {
            this.vy -= this.speed * 1.5;
        }
        if (keys['ArrowDown']) {
            this.drill(world, game);
        }

        // Drop minerals
        if (keys[' ']) {
            this.dropMinerals();
            keys[' '] = false;
        }

        // Use bomb
        if (keys['b'] || keys['B']) {
            this.useBomb(world, game);
            keys['b'] = false;
            keys['B'] = false;
        }

        // Apply drag
        this.vx *= 0.92;
        this.vy *= 0.95;

        // Clamp velocity
        const maxVel = 2;
        this.vx = Math.max(-maxVel, Math.min(maxVel, this.vx));
        this.vy = Math.max(-maxVel, Math.min(maxVel, this.vy));

        // Move player
        this.x += this.vx;
        this.y += this.vy;

        // Collision with world boundaries
        if (this.x < 1) this.x = 1;
        if (this.x > WORLD_WIDTH - 2) this.x = WORLD_WIDTH - 2;
        if (this.y < 0) this.y = 0;
        if (this.y > WORLD_HEIGHT - 2) this.y = WORLD_HEIGHT - 2;

        // Check collision with blocks
        this.handleCollisions(world);

        // Fuel consumption
        const fuelConsumption = 0.04 + Math.abs(this.vx) * 0.01 + Math.abs(this.vy) * 0.01;
        this.fuel = Math.max(0, this.fuel - fuelConsumption);

        // Heat mechanics - heat increases with depth
        const depth = Math.max(0, this.y - SURFACE_LEVEL);
        const depthHeat = depth * 0.015; // Heat gain from depth

        // Natural cooling happens continuously
        const naturalCooling = this.cooling * 0.3;

        // Net heat change
        const heatChange = depthHeat - naturalCooling;
        this.heat = Math.max(0, Math.min(this.maxHeat, this.heat + heatChange));

        // Overheat damage
        if (this.heat >= this.maxHeat * 0.95) {
            this.hull -= 0.8; // Severe overheat damage
        } else if (this.heat >= this.maxHeat * 0.8) {
            this.hull -= 0.3; // Mild overheat damage
        }
    }

    drill(world, game) {
        const blockX = Math.floor(this.x);
        const blockY = Math.floor(this.y + 1);

        // Also check blocks to the sides if moving horizontally
        const sideBlockX = Math.floor(this.x + Math.sign(this.vx) * 0.6);
        const sideBlockY = Math.floor(this.y);

        // Try drilling down first
        let drilled = this.tryDrillBlock(world, game, blockX, blockY, 0, 0.1);

        // If moving sideways, also drill in that direction
        if (!drilled && Math.abs(this.vx) > 0.3) {
            drilled = this.tryDrillBlock(world, game, sideBlockX, sideBlockY, Math.sign(this.vx) * 0.05, 0);
        }
    }

    tryDrillBlock(world, game, blockX, blockY, vxPush, vyPush) {
        if (blockY >= SURFACE_LEVEL && blockY < WORLD_HEIGHT && blockX >= 0 && blockX < WORLD_WIDTH) {
            const block = world.getBlock(blockX, blockY);

            if (block && block.type !== BLOCK_TYPES.AIR && block.type !== BLOCK_TYPES.UNBREAKABLE) {
                const hardness = this.getBlockHardness(block.type);

                if (this.drillPower >= hardness) {
                    // Mine the block
                    this.vx += vxPush;
                    this.vy += vyPush;
                    this.heat += 1.5; // Drilling generates heat
                    this.fuel -= 0.15; // Drilling uses fuel

                    // Visual and audio feedback
                    const color = block.mineral ? block.mineral.color : '#654321';
                    game.spawnParticles(blockX, blockY, color, 3);
                    if (Math.random() < 0.2) game.audio.playDrill();

                    // Collect mineral
                    if (block.mineral) {
                        if (this.cargoWeight + block.mineral.weight <= this.maxCargo) {
                            this.cargo.push(block.mineral);
                            this.cargoWeight += block.mineral.weight;
                            if (block.mineral.value > 10 && Math.random() < 0.3) {
                                game.audio.playCollect();
                            }
                        }
                        // If cargo full, mineral is lost (realistic)
                    }

                    world.setBlock(blockX, blockY, BLOCK_TYPES.AIR);
                    return true;
                }
            }
        }
        return false;
    }

    handleCollisions(world) {
        const blockX = Math.floor(this.x);
        const blockY = Math.floor(this.y);

        let collided = false;
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

        // Check surrounding blocks
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const bx = blockX + dx;
                const by = blockY + dy;

                if (by >= 0 && by < WORLD_HEIGHT) {
                    const block = world.getBlock(bx, by);

                    if (block && block.type !== BLOCK_TYPES.AIR) {
                        // Check if player overlaps with block
                        const distX = Math.abs(this.x - bx);
                        const distY = Math.abs(this.y - by);

                        if (distX < 0.6 && distY < 0.6) {
                            // Push player away from block
                            if (distX > distY) {
                                this.x += (this.x > bx ? 0.05 : -0.05);
                                this.vx *= -0.3;
                            } else {
                                this.y += (this.y > by ? 0.05 : -0.05);
                                this.vy *= -0.3;
                            }

                            if (!collided && speed > 1.2) {
                                // Only damage on high-speed collisions
                                this.hull -= speed * 0.5;
                                collided = true;
                            }
                        }
                    }
                }
            }
        }
    }

    useBomb(world, game) {
        if (this.bombs > 0) {
            this.bombs--;
            game.audio.playBomb();

            const bombX = Math.floor(this.x);
            const bombY = Math.floor(this.y);
            const radius = 2;

            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (dx * dx + dy * dy <= radius * radius) {
                        const bx = bombX + dx;
                        const by = bombY + dy;

                        if (by >= SURFACE_LEVEL && by < WORLD_HEIGHT && bx >= 0 && bx < WORLD_WIDTH) {
                            const block = world.getBlock(bx, by);
                            if (block && block.type !== BLOCK_TYPES.UNBREAKABLE) {
                                // Create explosion particles
                                game.spawnParticles(bx, by, '#ff6600', 5);
                                world.setBlock(bx, by, BLOCK_TYPES.AIR);
                            }
                        }
                    }
                }
            }
        }
    }

    dropMinerals() {
        if (this.cargo.length > 0) {
            this.cargo.pop();
            this.cargoWeight = this.cargo.reduce((sum, m) => sum + m.weight, 0);
        }
    }

    getBlockHardness(blockType) {
        switch (blockType) {
            case BLOCK_TYPES.SOFT_EARTH: return 1;
            case BLOCK_TYPES.HARD_ROCK: return 2;
            case BLOCK_TYPES.VERY_HARD: return 4;
            default: return 999;
        }
    }

    applyUpgrades() {
        // Engine
        this.speed = 0.1 + (this.upgrades.engine || 0) * 0.03;

        // Drill
        this.drillPower = 1 + (this.upgrades.drill || 0);

        // Fuel tank
        this.maxFuel = 100 + (this.upgrades.fuel_tank || 0) * 50;

        // Cargo
        this.maxCargo = 50 + (this.upgrades.cargo || 0) * 20;

        // Hull
        this.maxHull = 100 + (this.upgrades.hull || 0) * 30;

        // Cooling
        this.cooling = 0.5 + (this.upgrades.cooling || 0) * 0.3;

        // Bombs
        this.maxBombs = 3 + (this.upgrades.bombs || 0) * 2;
    }

    render(ctx, camera) {
        const screenX = this.x * BLOCK_SIZE - camera.x;
        const screenY = this.y * BLOCK_SIZE - camera.y;

        // Flash red when damaged
        const hullPercent = this.hull / this.maxHull;
        let vehicleColor = '#ffaa00';
        if (hullPercent < 0.3 && Math.floor(Date.now() / 200) % 2 === 0) {
            vehicleColor = '#ff5500';
        }

        // Draw vehicle body
        ctx.fillStyle = vehicleColor;
        ctx.fillRect(screenX - 10, screenY - 10, 20, 20);

        // Heat glow effect
        if (this.heat > this.maxHeat * 0.5) {
            const heatAlpha = (this.heat / this.maxHeat) * 0.5;
            ctx.globalAlpha = heatAlpha;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(screenX - 12, screenY - 12, 24, 24);
            ctx.globalAlpha = 1;
        }

        // Draw drill
        ctx.fillStyle = '#888';
        ctx.fillRect(screenX - 6, screenY + 10, 12, 8);

        // Draw windows
        ctx.fillStyle = '#00aaff';
        ctx.fillRect(screenX - 6, screenY - 6, 4, 4);
        ctx.fillRect(screenX + 2, screenY - 6, 4, 4);

        // Draw cargo indicator
        if (this.cargo.length > 0) {
            const cargoPercent = this.cargoWeight / this.maxCargo;
            ctx.fillStyle = `rgba(255, 255, 0, ${cargoPercent})`;
            ctx.fillRect(screenX - 4, screenY, 8, 4);
        }
    }

    getSaveData() {
        return {
            x: this.x,
            y: this.y,
            fuel: this.fuel,
            maxFuel: this.maxFuel,
            hull: this.hull,
            maxHull: this.maxHull,
            heat: this.heat,
            cargo: this.cargo,
            cargoWeight: this.cargoWeight,
            maxCargo: this.maxCargo,
            money: this.money,
            upgrades: this.upgrades,
            bombs: this.bombs,
            maxBombs: this.maxBombs
        };
    }

    loadFromSave(data) {
        Object.assign(this, data);
        this.vx = 0;
        this.vy = 0;
        this.applyUpgrades();
    }
}

// ========================================
// WORLD CLASS
// ========================================
class World {
    constructor() {
        this.blocks = [];
        this.generate();
    }

    generate() {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            this.blocks[y] = [];
            for (let x = 0; x < WORLD_WIDTH; x++) {
                this.blocks[y][x] = this.generateBlock(x, y);
            }
        }
    }

    generateBlock(x, y) {
        // Surface is air
        if (y < SURFACE_LEVEL) {
            return { type: BLOCK_TYPES.AIR, mineral: null };
        }

        // Determine block type based on depth
        const depth = y - SURFACE_LEVEL;
        let blockType;

        if (depth < 20) {
            blockType = BLOCK_TYPES.SOFT_EARTH;
        } else if (depth < 60) {
            blockType = Math.random() < 0.7 ? BLOCK_TYPES.SOFT_EARTH : BLOCK_TYPES.HARD_ROCK;
        } else if (depth < 120) {
            blockType = Math.random() < 0.5 ? BLOCK_TYPES.HARD_ROCK : BLOCK_TYPES.VERY_HARD;
        } else {
            blockType = Math.random() < 0.3 ? BLOCK_TYPES.HARD_ROCK : BLOCK_TYPES.VERY_HARD;
        }

        // Occasional unbreakable blocks deep down
        if (depth > 80 && Math.random() < 0.02) {
            blockType = BLOCK_TYPES.UNBREAKABLE;
        }

        // Determine mineral
        let mineral = null;
        if (blockType !== BLOCK_TYPES.AIR && blockType !== BLOCK_TYPES.UNBREAKABLE) {
            mineral = this.generateMineral(depth);
        }

        return { type: blockType, mineral };
    }

    generateMineral(depth) {
        const rand = Math.random();

        // Define mineral probability ranges based on depth
        // Deeper = better minerals more common

        // Very shallow (0-20)
        if (depth < 20) {
            if (rand < 0.9) return MINERALS.DIRT;
            return MINERALS.COAL;
        }

        // Shallow (20-40)
        if (depth < 40) {
            if (rand < 0.6) return MINERALS.DIRT;
            if (rand < 0.85) return MINERALS.COAL;
            return MINERALS.COPPER;
        }

        // Medium depth (40-70)
        if (depth < 70) {
            if (rand < 0.4) return MINERALS.DIRT;
            if (rand < 0.65) return MINERALS.COAL;
            if (rand < 0.85) return MINERALS.COPPER;
            if (rand < 0.95) return MINERALS.IRON;
            return MINERALS.SILVER;
        }

        // Deep (70-100)
        if (depth < 100) {
            if (rand < 0.25) return MINERALS.DIRT;
            if (rand < 0.45) return MINERALS.COPPER;
            if (rand < 0.7) return MINERALS.IRON;
            if (rand < 0.9) return MINERALS.SILVER;
            if (rand < 0.97) return MINERALS.GOLD;
            return MINERALS.DIAMOND;
        }

        // Very deep (100-140)
        if (depth < 140) {
            if (rand < 0.15) return MINERALS.DIRT;
            if (rand < 0.35) return MINERALS.IRON;
            if (rand < 0.6) return MINERALS.SILVER;
            if (rand < 0.85) return MINERALS.GOLD;
            if (rand < 0.96) return MINERALS.DIAMOND;
            return MINERALS.ALIEN;
        }

        // Extreme depth (140+)
        if (rand < 0.3) return MINERALS.SILVER;
        if (rand < 0.6) return MINERALS.GOLD;
        if (rand < 0.88) return MINERALS.DIAMOND;
        return MINERALS.ALIEN;
    }

    getBlock(x, y) {
        if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
            return null;
        }
        return this.blocks[y][x];
    }

    setBlock(x, y, type, mineral = null) {
        if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
            this.blocks[y][x] = { type, mineral };
        }
    }

    render(ctx, camera) {
        const startX = Math.floor(camera.x / BLOCK_SIZE);
        const startY = Math.floor(camera.y / BLOCK_SIZE);
        const endX = startX + Math.ceil(ctx.canvas.width / BLOCK_SIZE) + 1;
        const endY = startY + Math.ceil(ctx.canvas.height / BLOCK_SIZE) + 1;

        for (let y = Math.max(0, startY); y < Math.min(WORLD_HEIGHT, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(WORLD_WIDTH, endX); x++) {
                const block = this.getBlock(x, y);
                if (!block || block.type === BLOCK_TYPES.AIR) continue;

                const screenX = x * BLOCK_SIZE - camera.x;
                const screenY = y * BLOCK_SIZE - camera.y;

                // Determine color
                let color;
                if (block.mineral && block.type !== BLOCK_TYPES.UNBREAKABLE) {
                    color = block.mineral.color;
                } else {
                    switch (block.type) {
                        case BLOCK_TYPES.SOFT_EARTH:
                            color = '#654321';
                            break;
                        case BLOCK_TYPES.HARD_ROCK:
                            color = '#555555';
                            break;
                        case BLOCK_TYPES.VERY_HARD:
                            color = '#333333';
                            break;
                        case BLOCK_TYPES.UNBREAKABLE:
                            color = '#111111';
                            break;
                        default:
                            color = '#000';
                    }
                }

                // Darken based on depth
                const depth = y - SURFACE_LEVEL;
                const darkening = Math.min(0.7, depth / WORLD_HEIGHT);
                const [r, g, b] = this.hexToRgb(color);
                color = `rgb(${r * (1 - darkening)}, ${g * (1 - darkening)}, ${b * (1 - darkening)})`;

                ctx.fillStyle = color;
                ctx.fillRect(screenX, screenY, BLOCK_SIZE, BLOCK_SIZE);

                // Draw grid for unbreakable blocks
                if (block.type === BLOCK_TYPES.UNBREAKABLE) {
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(screenX, screenY, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }

        // Draw surface line
        const surfaceY = SURFACE_LEVEL * BLOCK_SIZE - camera.y;
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, surfaceY);
        ctx.lineTo(ctx.canvas.width, surfaceY);
        ctx.stroke();
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    }

    getSaveData() {
        return {
            blocks: this.blocks
        };
    }

    loadFromSave(data) {
        this.blocks = data.blocks;
    }
}

// ========================================
// START GAME
// ========================================
const game = new Game();
