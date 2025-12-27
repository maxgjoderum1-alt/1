// ========================================
// MOTHERLOAD - Mining Game
// ========================================

// Constants
const BLOCK_SIZE = 20;
const WORLD_WIDTH = 60;
const WORLD_HEIGHT = 10000;
const SURFACE_LEVEL = 5;
const VICTORY_DEPTH = 9000;

// Shop locations on surface
const SHOPS = {
    FUEL: { x: 10, y: SURFACE_LEVEL - 1, name: 'FUEL STATION', color: '#00ff00' },
    SELL: { x: 20, y: SURFACE_LEVEL - 1, name: 'TRADING POST', color: '#ffff00' },
    UPGRADE: { x: 40, y: SURFACE_LEVEL - 1, name: 'UPGRADE CENTER', color: '#00aaff' },
    REPAIR: { x: 50, y: SURFACE_LEVEL - 1, name: 'REPAIR & ITEMS', color: '#ff9900' }
};

// Mineral types
const MINERALS = {
    IRON: { name: 'Iron', color: '#808080', value: 20, weight: 4, rarity: 0.2 },
    BRONZE: { name: 'Bronze', color: '#CD7F32', value: 40, weight: 4, rarity: 0.12 },
    SILVER: { name: 'Silver', color: '#C0C0C0', value: 75, weight: 5, rarity: 0.08 },
    GOLD: { name: 'Gold', color: '#FFD700', value: 150, weight: 6, rarity: 0.04 },
    EMERALD: { name: 'Emerald', color: '#50C878', value: 300, weight: 4, rarity: 0.015 },
    DIAMOND: { name: 'Diamond', color: '#00FFFF', value: 500, weight: 3, rarity: 0.008 }
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
        this.hasLeftShopArea = true; // Track if player has moved away from shop
        this.shopWaitStartTime = 0; // Track when player became stationary at shop
        this.shopWaitDuration = 2000; // 2 seconds in milliseconds

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
        // Clear any old save data that might be corrupted
        localStorage.removeItem('motherload-save');
        // Save/load disabled - world too large (600,000 blocks)
        document.getElementById('continue-btn').style.display = 'none';
    }

    newGame() {
        this.world = new World();
        // Start player on TOP of surface blocks (surface is at y=5, block top is at 5.0, player center should be at 4.8)
        this.player = new Player(WORLD_WIDTH / 2 + 0.5, SURFACE_LEVEL - 0.2); // Centered on block, standing on top
        this.currentShop = null;
        this.gameOver = false;
        this.victory = false;
        this.running = true;
        this.inShop = false; // Ensure not in shop
        this.particles = []; // Clear particles

        document.getElementById('start-menu').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        document.getElementById('game-over-overlay').style.display = 'none';
        document.getElementById('victory-overlay').style.display = 'none';
        document.getElementById('shop-overlay').style.display = 'none'; // Ensure shop closed

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
        if (!this.running || this.gameOver || this.victory) {
            return;
        }

        this.update();
        this.render();
        this.updateUI();

        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (this.inShop) {
            return;
        }

        this.player.update(this.keys, this.world, this);

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Check proximity to shops - only when on surface and stationary
        const speed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
        const now = Date.now();

        if (this.player.y <= SURFACE_LEVEL && !this.inShop) {
            // Check if player is near any shop
            let nearAnyShop = false;
            let nearestShop = null;
            let nearestDistance = Infinity;

            for (const [shopType, shop] of Object.entries(SHOPS)) {
                const distance = Math.abs(this.player.x - shop.x);
                if (distance < 2) {
                    nearAnyShop = true;
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestShop = shopType;
                    }
                }
            }

            // If player has moved away from all shops, mark as left shop area
            if (!nearAnyShop) {
                this.hasLeftShopArea = true;
                this.shopWaitStartTime = 0; // Reset timer
            }

            // Check if player is stationary at a shop
            if (nearestShop && speed < 0.25 && this.hasLeftShopArea) {
                // Start timer if not already started
                if (this.shopWaitStartTime === 0) {
                    this.shopWaitStartTime = now;
                }

                // Open shop after 3 seconds of being stationary
                if (now - this.shopWaitStartTime >= this.shopWaitDuration) {
                    this.openShop(nearestShop);
                    this.shopWaitStartTime = 0; // Reset for next time
                }
            } else if (speed >= 0.25) {
                // Reset timer if player starts moving
                this.shopWaitStartTime = 0;
            }
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

        // Auto-save disabled - world too large for localStorage (10,000 blocks deep)
        // Manual save on shop close still works for smaller save data
        // if (Math.random() < 0.01) {
        //     this.saveGame();
        // }
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

    openShop(shopType) {
        this.inShop = true;
        this.currentShop = shopType;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.isOnSurface = true;

        // Cool down heat when on surface
        this.player.heat = Math.max(0, this.player.heat - 10);

        document.getElementById('shop-overlay').style.display = 'flex';
        this.updateShopUI();
    }

    closeShop() {
        this.inShop = false;
        this.player.isOnSurface = false;
        this.hasLeftShopArea = false; // Player must move away before reopening
        document.getElementById('shop-overlay').style.display = 'none';
        // this.saveGame(); // Disabled - world too large for localStorage
    }

    updateShopUI() {
        const shopInfo = SHOPS[this.currentShop];
        const shopContent = document.querySelector('.shop-content');

        // Update shop title
        document.querySelector('.shop-content h2').textContent = shopInfo.name;
        document.querySelector('.shop-content h2').style.color = shopInfo.color;

        // Clear sections
        const sections = document.querySelectorAll('.shop-section');
        sections.forEach(section => section.style.display = 'none');

        // Show relevant section based on shop type
        if (this.currentShop === 'FUEL') {
            this.renderFuelShop();
        } else if (this.currentShop === 'SELL') {
            this.renderSellShop();
        } else if (this.currentShop === 'UPGRADE') {
            this.renderUpgradeShop();
        } else if (this.currentShop === 'REPAIR') {
            this.renderRepairShop();
        }
    }

    renderFuelShop() {
        const section = document.querySelector('.shop-section');
        section.style.display = 'block';

        const refuelCost = Math.ceil((this.player.maxFuel - this.player.fuel) * 0.5);
        const canRefuel = refuelCost > 0 && this.player.money >= refuelCost;

        section.innerHTML = `
            <h3>FUEL SERVICES</h3>
            <button class="shop-btn" id="refuel-full-btn" ${!canRefuel ? 'disabled' : ''}>
                REFUEL - $${refuelCost}
            </button>
            <div style="color: #888; margin-top: 10px;">
                Current: ${Math.floor(this.player.fuel)}/${this.player.maxFuel}
            </div>
        `;

        const refuelBtn = document.getElementById('refuel-full-btn');
        if (refuelBtn) refuelBtn.addEventListener('click', () => this.refuel());
    }

    renderSellShop() {
        const section = document.querySelector('.shop-section');
        section.style.display = 'block';

        let totalValue = 0;
        const mineralCounts = {};

        // Count each type of mineral
        this.player.cargo.forEach(mineral => {
            totalValue += mineral.value;
            if (!mineralCounts[mineral.name]) {
                mineralCounts[mineral.name] = { count: 0, value: 0, color: mineral.color };
            }
            mineralCounts[mineral.name].count++;
            mineralCounts[mineral.name].value += mineral.value;
        });

        // Generate mineral list HTML
        let mineralListHTML = '';
        for (const [name, data] of Object.entries(mineralCounts)) {
            mineralListHTML += `
                <div style="color: ${data.color}; margin: 5px 0; padding: 5px; background: rgba(0,20,0,0.5);">
                    ${name}: ${data.count}x - $${data.value}
                </div>
            `;
        }

        section.innerHTML = `
            <h3>TRADING POST</h3>
            <div style="color: #888; margin-bottom: 10px;">
                Total Cargo: ${this.player.cargo.length} items
            </div>
            ${mineralListHTML || '<div style="color: #666;">No cargo to sell</div>'}
            <button class="shop-btn" id="sell-all-btn" style="margin-top: 15px;" ${this.player.cargo.length === 0 ? 'disabled' : ''}>
                SELL ALL CARGO - $${totalValue}
            </button>
        `;

        const sellBtn = document.getElementById('sell-all-btn');
        if (sellBtn) sellBtn.addEventListener('click', () => this.sellCargo());
    }

    renderUpgradeShop() {
        const section = document.querySelector('.shop-section');
        section.style.display = 'block';
        section.innerHTML = '<h3>UPGRADES</h3><div id="upgrades-list-dynamic"></div>';
        this.renderUpgrades();
    }

    renderRepairShop() {
        const section = document.querySelector('.shop-section');
        section.style.display = 'block';

        const repairCost = Math.ceil((this.player.maxHull - this.player.hull) * 2);
        const canRepair = repairCost > 0 && this.player.money >= repairCost;

        section.innerHTML = `
            <h3>REPAIR & ITEMS</h3>
            <button class="shop-btn" id="repair-hull-dynamic-btn" ${!canRepair ? 'disabled' : ''}>
                REPAIR HULL - $${repairCost}
            </button>
            <button class="shop-btn" id="restock-bombs-btn">
                RESTOCK BOMBS (Free)
            </button>
            <div style="color: #888; margin-top: 10px;">
                Hull: ${Math.floor(this.player.hull)}/${this.player.maxHull}<br>
                Bombs: ${this.player.bombs}/${this.player.maxBombs}
            </div>
        `;

        const repairBtn = document.getElementById('repair-hull-dynamic-btn');
        const bombsBtn = document.getElementById('restock-bombs-btn');
        if (repairBtn) repairBtn.addEventListener('click', () => this.repairHull());
        if (bombsBtn) bombsBtn.addEventListener('click', () => {
            this.player.bombs = this.player.maxBombs;
            this.updateShopUI();
        });
    }

    renderUpgrades() {
        const upgradesList = document.getElementById('upgrades-list-dynamic') || document.getElementById('upgrades-list');
        if (!upgradesList) return;
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
    constructor(x = WORLD_WIDTH / 2, y = SURFACE_LEVEL - 2) {
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
        this.speed = 0.03; // Reduced from 0.04 for slower surface movement
        this.drillPower = 1;
        this.cooling = 0.5;
        this.bombs = 3;
        this.maxBombs = 3;
        this.lastDrillTime = 0;
        this.drillCooldown = 300; // 300ms between drills

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
        // Apply gravity (balanced - not too strong)
        this.vy += 0.05;

        // Track if thrusting (for fuel consumption)
        let isThrusting = false;

        // Handle input with momentum (supports both Arrow keys and WASD)
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            this.vx -= this.speed;
            isThrusting = true;
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            this.vx += this.speed;
            isThrusting = true;
        }
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            this.vy -= this.speed * 2.5; // Increased from 1.5 to overcome gravity (0.05)
            isThrusting = true;
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
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

        // Apply drag (more drag for slower, more controllable movement)
        this.vx *= 0.84;
        this.vy *= 0.88; // Increased from 0.90 to reduce terminal velocity

        // Clamp velocity (reduced for safer collision and prevent falling through blocks)
        const maxVel = 0.5; // Reduced from 0.8 to prevent tunneling through blocks
        this.vx = Math.max(-maxVel, Math.min(maxVel, this.vx));
        this.vy = Math.max(-maxVel, Math.min(maxVel, this.vy));

        // Store old position for collision revert
        const oldX = this.x;
        const oldY = this.y;

        // Move player HORIZONTALLY first
        this.x += this.vx;

        // Check and resolve HORIZONTAL collisions only
        this.handleHorizontalCollisions(world);

        // Then move VERTICALLY
        this.y += this.vy;

        // Check and resolve VERTICAL collisions only
        this.handleVerticalCollisions(world);

        // Collision with world boundaries
        if (this.x < 1) {
            this.x = 1;
            this.vx = 0;
        }
        if (this.x > WORLD_WIDTH - 2) {
            this.x = WORLD_WIDTH - 2;
            this.vx = 0;
        }
        if (this.y < 0) {
            this.y = 0;
            this.vy = 0;
        }
        if (this.y > WORLD_HEIGHT - 2) {
            this.y = WORLD_HEIGHT - 2;
            this.vy = 0;
        }

        // Fuel consumption - only when thrusting
        if (isThrusting) {
            const fuelConsumption = 0.08 + Math.abs(this.vx) * 0.01 + Math.abs(this.vy) * 0.01;
            this.fuel = Math.max(0, this.fuel - fuelConsumption);
        }

        // Heat mechanics - heat starts at depth 500, scales to depth 10000
        const depth = Math.max(0, this.y - SURFACE_LEVEL);

        // No heat until depth 500
        let depthHeat = 0;
        if (depth >= 500) {
            // Heat gradually increases from depth 500 to 10000
            const heatDepth = Math.min(depth - 500, 9500); // 0 to 9500 range
            depthHeat = (heatDepth / 9500) * 2.0; // Scales from 0 to 2.0
        }

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
        // Check cooldown
        const now = Date.now();
        if (now - this.lastDrillTime < this.drillCooldown) {
            return; // Still on cooldown
        }

        // Find which block column player is in
        const blockX = Math.floor(this.x);
        // Block CENTER is at blockX + 0.5 (blocks go from X to X+1)
        const blockCenterX = blockX + 0.5;
        const distToCenter = blockCenterX - this.x;

        // MUST be reasonably centered to drill (within 0.2 blocks = 20% of block width)
        if (Math.abs(distToCenter) > 0.2) {
            // Not centered enough - pull strongly toward center instead of drilling
            this.x += distToCenter * 0.5; // 50% pull when off-center
            return; // Don't drill until centered
        }

        // Close to center - snap to exact center for perfect alignment
        if (Math.abs(distToCenter) > 0.02) {
            this.x = blockCenterX; // Snap to exact block center
        }

        // Now drill directly below (player is centered on block column)
        const blockY = Math.floor(this.y + 1);
        const drilled = this.tryDrillBlock(world, game, blockX, blockY, 0, 0);

        // Update last drill time if we drilled something
        if (drilled) {
            this.lastDrillTime = now;
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

    handleHorizontalCollisions(world) {
        const blockX = Math.floor(this.x);
        const blockY = Math.floor(this.y);

        // Check surrounding blocks for horizontal collisions
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const bx = blockX + dx;
                const by = blockY + dy;

                if (by >= 0 && by < WORLD_HEIGHT && bx >= 0 && bx < WORLD_WIDTH) {
                    const block = world.getBlock(bx, by);

                    if (block && block.type !== BLOCK_TYPES.AIR) {
                        // Block center is at (bx + 0.5, by + 0.5)
                        const blockCenterX = bx + 0.5;
                        const blockCenterY = by + 0.5;

                        const distX = Math.abs(this.x - blockCenterX);
                        const distY = Math.abs(this.y - blockCenterY);

                        // SOLID horizontal collision - always resolve if overlapping
                        if (distX < 0.7 && distY < 0.7) {
                            const overlapX = 0.7 - distX;
                            const overlapY = 0.7 - distY;

                            // Resolve horizontally ONLY if horizontal overlap is smaller
                            // This prevents resolving ground collision horizontally
                            if (overlapX > 0.001 && overlapX < overlapY) {
                                // Push horizontally away from block center
                                this.x += (this.x > blockCenterX ? overlapX : -overlapX);
                                this.vx = 0;
                            }
                        }
                    }
                }
            }
        }
    }

    handleVerticalCollisions(world) {
        const blockX = Math.floor(this.x);
        const blockY = Math.floor(this.y);

        let collided = false;
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

        // Check surrounding blocks for vertical collisions
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const bx = blockX + dx;
                const by = blockY + dy;

                if (by >= 0 && by < WORLD_HEIGHT && bx >= 0 && bx < WORLD_WIDTH) {
                    const block = world.getBlock(bx, by);

                    if (block && block.type !== BLOCK_TYPES.AIR) {
                        // Block center is at (bx + 0.5, by + 0.5)
                        const blockCenterX = bx + 0.5;
                        const blockCenterY = by + 0.5;

                        const distX = Math.abs(this.x - blockCenterX);
                        const distY = Math.abs(this.y - blockCenterY);

                        // Vertical collision check
                        if (distX < 0.7 && distY < 0.7) {
                            const overlapY = 0.7 - distY;

                            if (overlapY > 0) {
                                // Push vertically away from block center
                                this.y += (this.y > blockCenterY ? overlapY : -overlapY);
                                this.vy = 0;

                                // Damage on fast collisions
                                if (!collided && speed > 0.6) {
                                    this.hull -= speed * 0.3;
                                    collided = true;
                                }
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
        this.speed = 0.03 + (this.upgrades.engine || 0) * 0.015;

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

        // CAVE GENERATION - Random air pockets underground
        const depth = y - SURFACE_LEVEL;

        // Create random caves/air pockets at various depths
        let caveProbability = 0;
        if (depth > 10 && depth < 100) {
            caveProbability = 0.03; // 3% chance shallow caves
        } else if (depth >= 100 && depth < 500) {
            caveProbability = 0.05; // 5% chance medium caves
        } else if (depth >= 500 && depth < 2000) {
            caveProbability = 0.04; // 4% chance deep caves
        } else if (depth >= 2000) {
            caveProbability = 0.03; // 3% chance very deep caves
        }

        // Random cave generation
        if (Math.random() < caveProbability) {
            return { type: BLOCK_TYPES.AIR, mineral: null };
        }

        // Determine block type based on depth
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

        // Define mineral probability based on depth
        // null = dirt (can dig but not collect)
        // Minerals: Iron, Bronze, Silver, Gold, Emerald, Diamond
        // Deeper = less dirt, rarer minerals more common

        // Shallow (0-500) - Mostly dirt, some Iron and Bronze
        if (depth < 500) {
            if (rand < 0.6) return null; // 60% dirt
            if (rand < 0.85) return MINERALS.IRON;
            if (rand < 0.98) return MINERALS.BRONZE;
            return MINERALS.SILVER;
        }

        // Medium (500-2000) - Less dirt, Bronze, Silver, some Gold
        if (depth < 2000) {
            if (rand < 0.35) return null; // 35% dirt
            if (rand < 0.6) return MINERALS.IRON;
            if (rand < 0.8) return MINERALS.BRONZE;
            if (rand < 0.95) return MINERALS.SILVER;
            return MINERALS.GOLD;
        }

        // Deep (2000-5000) - Little dirt, Silver, Gold, Emerald
        if (depth < 5000) {
            if (rand < 0.15) return null; // 15% dirt
            if (rand < 0.25) return MINERALS.BRONZE;
            if (rand < 0.55) return MINERALS.SILVER;
            if (rand < 0.8) return MINERALS.GOLD;
            if (rand < 0.95) return MINERALS.EMERALD;
            return MINERALS.DIAMOND;
        }

        // Very Deep (5000-8000) - Almost no dirt, Gold, Emerald, Diamond
        if (depth < 8000) {
            if (rand < 0.05) return null; // 5% dirt
            if (rand < 0.3) return MINERALS.SILVER;
            if (rand < 0.6) return MINERALS.GOLD;
            if (rand < 0.85) return MINERALS.EMERALD;
            return MINERALS.DIAMOND;
        }

        // Extreme Depth (8000+) - No dirt, only precious minerals
        if (rand < 0.4) return MINERALS.GOLD;
        if (rand < 0.7) return MINERALS.EMERALD;
        return MINERALS.DIAMOND;
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

        // Draw shops on surface
        for (const [shopType, shop] of Object.entries(SHOPS)) {
            const shopScreenX = shop.x * BLOCK_SIZE - camera.x;
            const shopScreenY = shop.y * BLOCK_SIZE - camera.y;

            // Draw shop building
            ctx.fillStyle = shop.color;
            ctx.fillRect(shopScreenX - 15, shopScreenY - 30, 30, 30);

            // Draw shop border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(shopScreenX - 15, shopScreenY - 30, 30, 30);

            // Draw shop label
            ctx.fillStyle = '#000';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(shopType[0], shopScreenX, shopScreenY - 15);
        }

        // Draw mountain walls/rock in all out-of-bounds visible areas
        const leftWallX = 0 * BLOCK_SIZE - camera.x;
        const rightWallX = WORLD_WIDTH * BLOCK_SIZE - camera.x;

        // Helper function to draw a rock block
        const drawRockBlock = (screenX, screenY, y) => {
            const depth = y - SURFACE_LEVEL;
            const variation = (y % 3) * 0.1;
            const baseColor = depth < 0 ? [101, 67, 33] : [85, 85, 85]; // Brown above, gray below
            const darkening = Math.min(0.7, Math.max(0, depth) / WORLD_HEIGHT);

            ctx.fillStyle = `rgb(${baseColor[0] * (1 - darkening + variation)}, ${baseColor[1] * (1 - darkening + variation)}, ${baseColor[2] * (1 - darkening + variation)})`;
            ctx.fillRect(screenX, screenY, BLOCK_SIZE, BLOCK_SIZE);

            // Add texture lines
            if (y % 2 === 0) {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(screenX + BLOCK_SIZE, screenY);
                ctx.stroke();
            }
        };

        // Fill left and right sides with mountains (only from y=0 downwards, not in sky)
        for (let y = Math.max(0, startY); y < endY; y++) {
            const screenY = y * BLOCK_SIZE - camera.y;

            // Left side (x < 0)
            for (let x = startX; x < 0 && x < endX; x++) {
                const screenX = x * BLOCK_SIZE - camera.x;
                drawRockBlock(screenX, screenY, y);
            }

            // Right side (x >= WORLD_WIDTH)
            for (let x = Math.max(WORLD_WIDTH, startX); x < endX; x++) {
                const screenX = x * BLOCK_SIZE - camera.x;
                drawRockBlock(screenX, screenY, y);
            }
        }

        // Bottom area (y >= WORLD_HEIGHT) - fill entire width
        for (let y = Math.max(WORLD_HEIGHT, startY); y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const screenX = x * BLOCK_SIZE - camera.x;
                const screenY = y * BLOCK_SIZE - camera.y;
                drawRockBlock(screenX, screenY, y);
            }
        }
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
