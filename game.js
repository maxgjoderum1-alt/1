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
    FUEL: { x: 10, y: SURFACE_LEVEL, name: 'FUEL STATION', color: '#00ff00' },
    SELL: { x: 20, y: SURFACE_LEVEL, name: 'TRADING POST', color: '#ffff00' },
    UPGRADE: { x: 40, y: SURFACE_LEVEL, name: 'UPGRADE CENTER', color: '#00aaff' },
    REPAIR: { x: 50, y: SURFACE_LEVEL, name: 'REPAIR & ITEMS', color: '#ff9900' }
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
    UNBREAKABLE: 4,
    BOMB_ROCK: 5  // Hard stone - only removable with bombs (appears at depth 500+)
};

// ========================================
// BOSS CLASS
// ========================================
class Boss {
    constructor(x, y, maxHealth, groundY, canJump = false) {
        this.x = x;
        this.y = y;
        this.vx = 0.05; // Walking speed
        this.vy = 0;
        this.width = 3; // 3 blocks wide
        this.height = 4; // 4 blocks tall
        this.health = maxHealth;
        this.maxHealth = maxHealth;
        this.direction = 1; // 1 = right, -1 = left
        this.alive = true;
        this.groundY = groundY; // Floor level for this boss arena
        this.canJump = canJump; // Can this boss jump?
        this.jumpCooldown = 0; // Frames until next jump allowed
        this.onGround = false; // Is boss on ground?
    }

    update(world) {
        if (!this.alive) return;

        // Apply gravity
        this.vy += 0.05;

        // Move horizontally
        this.x += this.vx * this.direction;

        // Check for walls or edges - turn around
        const leftEdge = Math.floor(this.x - this.width / 2);
        const rightEdge = Math.floor(this.x + this.width / 2);

        // Check if hit wall or edge (arena is full width: x=0 to x=60)
        if (leftEdge <= 1 || rightEdge >= 59) {
            this.direction *= -1; // Turn around
        }

        // Apply vertical movement
        this.y += this.vy;

        // Ground collision
        if (this.y + this.height / 2 > this.groundY) {
            this.y = this.groundY - this.height / 2;
            this.vy = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Jumping mechanics (only for boss 2)
        if (this.canJump && this.onGround && this.jumpCooldown <= 0) {
            // Jump randomly (20% chance each frame when on ground)
            if (Math.random() < 0.02) {
                this.vy = -0.6; // Jump velocity (reduced to stay in arena)
                this.jumpCooldown = 120; // 2 seconds cooldown (60 fps)
            }
        }

        // Decrease jump cooldown
        if (this.jumpCooldown > 0) {
            this.jumpCooldown--;
        }
    }

    takeDamage(damage) {
        if (!this.alive) return;

        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
        }
    }

    render(ctx, camera) {
        if (!this.alive) return;

        const screenX = this.x * BLOCK_SIZE - camera.x;
        const screenY = this.y * BLOCK_SIZE - camera.y;
        const width = this.width * BLOCK_SIZE;
        const height = this.height * BLOCK_SIZE;

        // Draw boss body (dark red)
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(screenX - width / 2, screenY - height / 2, width, height);

        // Draw boss eyes
        ctx.fillStyle = '#ff0000';
        const eyeSize = 8;
        ctx.fillRect(screenX - width / 4 - eyeSize / 2, screenY - height / 4, eyeSize, eyeSize);
        ctx.fillRect(screenX + width / 4 - eyeSize / 2, screenY - height / 4, eyeSize, eyeSize);

        // Draw boss mouth
        ctx.fillStyle = '#000';
        ctx.fillRect(screenX - width / 3, screenY + height / 6, width * 2 / 3, 4);

        // Draw health bar
        const barWidth = width;
        const barHeight = 6;
        const barX = screenX - barWidth / 2;
        const barY = screenY - height / 2 - 15;

        // Background (red)
        ctx.fillStyle = '#400';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health (green to red gradient based on health)
        const healthPercent = this.health / this.maxHealth;
        const healthWidth = barWidth * healthPercent;

        if (healthPercent > 0.5) {
            ctx.fillStyle = '#0f0';
        } else if (healthPercent > 0.25) {
            ctx.fillStyle = '#ff0';
        } else {
            ctx.fillStyle = '#f00';
        }
        ctx.fillRect(barX, barY, healthWidth, barHeight);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Health text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.health}/${this.maxHealth}`, screenX, barY - 4);
    }
}

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
// BOMB SYSTEM
// ========================================
class Bomb {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.exploded = false;
        this.radius = 4; // Explosion radius in blocks (reduced from 7)
        this.createdTime = Date.now(); // Track when bomb was created
        this.fuseTime = 1500; // 1.5 seconds in milliseconds
    }

    update(world) {
        if (this.exploded) return;

        // Check if fuse timer has expired (only explodes after 1.5 seconds)
        const timeAlive = Date.now() - this.createdTime;
        if (timeAlive >= this.fuseTime) {
            this.exploded = true;
            return;
        }

        // Apply gravity
        this.vy += 0.05;

        // Apply air resistance
        this.vx *= 0.99;
        this.vy *= 0.99;

        // Store old position
        const oldX = this.x;
        const oldY = this.y;

        // Apply horizontal velocity
        this.x += this.vx;

        // Check boundaries - prevent bomb from going outside playable area
        if (this.x < 0.5) {
            this.x = 0.5;
            this.vx = 0;
        }
        if (this.x > WORLD_WIDTH - 0.5) {
            this.x = WORLD_WIDTH - 0.5;
            this.vx = 0;
        }

        // Check horizontal collision with blocks
        let blockX = Math.floor(this.x);
        let blockY = Math.floor(this.y);

        if (blockX >= 0 && blockX < WORLD_WIDTH && blockY >= 0 && blockY < WORLD_HEIGHT) {
            let block = world.getBlock(blockX, blockY);
            if (block && block.type !== BLOCK_TYPES.AIR) {
                // Hit wall horizontally, revert x and stop horizontal movement
                this.x = oldX;
                this.vx = 0;
            }
        }

        // Apply vertical velocity
        this.y += this.vy;

        // Check vertical collision (only within playable world)
        blockX = Math.floor(this.x);
        blockY = Math.floor(this.y);

        // Only check collision if within world boundaries
        if (blockX >= 0 && blockX < WORLD_WIDTH && blockY >= 0 && blockY < WORLD_HEIGHT) {
            let block = world.getBlock(blockX, blockY);
            if (block && block.type !== BLOCK_TYPES.AIR) {
                // Hit ground, push bomb to top of block
                this.y = Math.floor(this.y);
                this.vy = 0;
                this.vx *= 0.8; // Friction when on ground
            }
        }
    }

    // Calculate where the bomb will land (for preview)
    predictLanding(world) {
        let px = this.x;
        let py = this.y;
        let pvx = this.vx;
        let pvy = this.vy;

        // Simulate up to 300 frames
        for (let i = 0; i < 300; i++) {
            px += pvx;
            py += pvy;
            pvy += 0.05;
            pvx *= 0.99;
            pvy *= 0.99;

            const blockX = Math.floor(px);
            const blockY = Math.floor(py);

            // Check bounds
            if (blockY >= WORLD_HEIGHT || blockX < 0 || blockX >= WORLD_WIDTH) {
                return { x: blockX, y: blockY };
            }

            const block = world.getBlock(blockX, blockY);
            if (block && block.type !== BLOCK_TYPES.AIR) {
                return { x: blockX, y: blockY };
            }
        }

        return { x: Math.floor(px), y: Math.floor(py) };
    }

    render(ctx, camera) {
        if (this.exploded) return;

        const screenX = this.x * BLOCK_SIZE - camera.x;
        const screenY = this.y * BLOCK_SIZE - camera.y;

        // Draw bomb as a black circle
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw fuse/spark
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(screenX - 2, screenY - 2, 2, 0, Math.PI * 2);
        ctx.fill();
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
        this.bombs = []; // Active thrown bombs
        this.boss = null; // First boss instance (500m depth)
        this.bossFloorRemoved = false; // Track if boss arena floor has been removed
        this.boss2 = null; // Second boss instance (2000m depth)
        this.boss2FloorRemoved = false; // Track if boss 2 arena floor has been removed
        this.audio = new AudioSystem();
        this.lastWarningTime = 0;
        this.needsDrillUpgradeWarning = false; // Show warning when trying to drill gold without upgrade
        this.hasLeftShopArea = true; // Track if player has moved away from shop
        this.shopWaitStartTime = 0; // Track when player became stationary at shop
        this.shopWaitDuration = 1000; // 1 second in milliseconds

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
        // Start player on TOP of surface blocks (surface is at y=5, center at 5.5)
        // Player visual size is 1.0 blocks (20px), so visual bottom at player.y + 0.5
        // At y=4.5, visual bottom = 5.0 (exactly on block top)
        this.player = new Player(WORLD_WIDTH / 2 + 0.5, SURFACE_LEVEL - 0.5); // Centered on block, standing on top
        this.currentShop = null;
        this.gameOver = false;
        this.victory = false;
        this.running = true;
        this.inShop = false; // Ensure not in shop
        this.particles = []; // Clear particles
        this.bombs = []; // Clear bombs

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

        // Update bombs
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            bomb.update(this.world);

            if (bomb.exploded) {
                // Explode the bomb
                this.explodeBomb(bomb);
                this.bombs.splice(i, 1);
            }
        }

        // Spawn boss 1 when player reaches depth 500m (y > 105)
        if (!this.boss && this.player.y > 105) {
            this.boss = new Boss(30, 110, 300, 115, false); // Boss 1: 300 HP, floor at y=115, no jump
        }

        // Spawn boss 2 when player reaches depth 2000m (y > 405)
        if (!this.boss2 && this.player.y > 405) {
            this.boss2 = new Boss(30, 410, 1000, 415, true); // Boss 2: 1000 HP, floor at y=415, can jump
        }

        // Update boss 1
        if (this.boss && this.boss.alive) {
            this.boss.update(this.world);
        }

        // Update boss 2
        if (this.boss2 && this.boss2.alive) {
            this.boss2.update(this.world);
        }

        // Boss collision damage - check if player touches either boss
        const bossDamageCooldown = 1000; // 1 second cooldown between boss damage
        const currentTime = Date.now();

        if (currentTime - this.player.lastDamageTime > bossDamageCooldown) {
            // Check boss 1 collision
            if (this.boss && this.boss.alive) {
                const distToBoss1 = Math.sqrt(
                    Math.pow(this.player.x - this.boss.x, 2) +
                    Math.pow(this.player.y - this.boss.y, 2)
                );

                // Boss collision radius (boss is 3 blocks wide, 4 tall, player is ~1 block)
                if (distToBoss1 < 2.5) {
                    this.player.hull -= 10; // Boss deals 10 damage
                    this.player.lastDamageTime = currentTime;
                    // Knockback effect
                    const knockbackX = (this.player.x - this.boss.x) * 0.3;
                    const knockbackY = -0.5; // Knock player up
                    this.player.vx += knockbackX;
                    this.player.vy += knockbackY;
                    // Spawn damage particles
                    this.spawnParticles(this.player.x, this.player.y, '#ff0000', 10);
                }
            }

            // Check boss 2 collision
            if (this.boss2 && this.boss2.alive) {
                const distToBoss2 = Math.sqrt(
                    Math.pow(this.player.x - this.boss2.x, 2) +
                    Math.pow(this.player.y - this.boss2.y, 2)
                );

                // Boss 2 collision radius
                if (distToBoss2 < 2.5) {
                    this.player.hull -= 15; // Boss 2 deals more damage (15)
                    this.player.lastDamageTime = currentTime;
                    // Stronger knockback for boss 2
                    const knockbackX = (this.player.x - this.boss2.x) * 0.4;
                    const knockbackY = -0.6;
                    this.player.vx += knockbackX;
                    this.player.vy += knockbackY;
                    // Spawn damage particles
                    this.spawnParticles(this.player.x, this.player.y, '#ff0000', 15);
                }
            }
        }

        // Remove UNBREAKABLE floor when boss 1 is defeated
        if (this.boss && !this.boss.alive && !this.bossFloorRemoved) {
            const bossFloorY = 115; // Boss 1 arena floor level
            // Remove floor blocks across entire arena width
            for (let x = 0; x < WORLD_WIDTH; x++) {
                const block = this.world.getBlock(x, bossFloorY);
                if (block && block.type === BLOCK_TYPES.UNBREAKABLE) {
                    this.world.setBlock(x, bossFloorY, BLOCK_TYPES.AIR, null);
                }
            }
            this.bossFloorRemoved = true; // Mark as processed
            // Spawn celebration particles
            this.spawnParticles(this.boss.x, this.boss.y, '#FFD700', 30);
        }

        // Remove UNBREAKABLE floor when boss 2 is defeated
        if (this.boss2 && !this.boss2.alive && !this.boss2FloorRemoved) {
            const boss2FloorY = 415; // Boss 2 arena floor level
            // Remove floor blocks across entire arena width
            for (let x = 0; x < WORLD_WIDTH; x++) {
                const block = this.world.getBlock(x, boss2FloorY);
                if (block && block.type === BLOCK_TYPES.UNBREAKABLE) {
                    this.world.setBlock(x, boss2FloorY, BLOCK_TYPES.AIR, null);
                }
            }
            this.boss2FloorRemoved = true; // Mark as processed
            // Spawn celebration particles
            this.spawnParticles(this.boss2.x, this.boss2.y, '#FFD700', 30);
        }

        // Check proximity to shops - only when on surface and stationary
        const speed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
        const now = Date.now();

        if (this.player.y <= SURFACE_LEVEL && !this.inShop) {
            // Check if player is standing on shop platform blocks
            let nearAnyShop = false;
            let nearestShop = null;

            const playerBlockX = Math.floor(this.player.x);

            for (const [shopType, shop] of Object.entries(SHOPS)) {
                // Player must stand on one of the 2 blocks under the shop
                // Shop at x=N has blocks at (N-1, SURFACE_LEVEL) and (N, SURFACE_LEVEL)
                if (playerBlockX === shop.x - 1 || playerBlockX === shop.x) {
                    nearAnyShop = true;
                    nearestShop = shopType;
                    break; // Found the shop
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

    explodeBomb(bomb) {
        this.audio.playBomb();

        const bombX = Math.floor(bomb.x);
        const bombY = Math.floor(bomb.y);
        const radius = bomb.radius;

        // Destroy blocks in radius
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= radius) {
                    const bx = bombX + dx;
                    const by = bombY + dy;

                    if (by >= SURFACE_LEVEL && by < WORLD_HEIGHT && bx >= 0 && bx < WORLD_WIDTH) {
                        const block = this.world.getBlock(bx, by);
                        if (block && block.type !== BLOCK_TYPES.UNBREAKABLE) {
                            // Spawn particles for destroyed block
                            const color = block.mineral ? block.mineral.color : '#8B7355';
                            this.spawnParticles(bx, by, color, 3);
                            this.world.setBlock(bx, by, BLOCK_TYPES.AIR);
                        }
                    }
                }
            }
        }

        // Check if boss 1 is in explosion radius
        if (this.boss && this.boss.alive) {
            const distToBoss = Math.sqrt(
                Math.pow(bomb.x - this.boss.x, 2) +
                Math.pow(bomb.y - this.boss.y, 2)
            );

            // If boss is within explosion radius, deal damage
            if (distToBoss <= radius) {
                this.boss.takeDamage(100);
                // Extra particles for hitting boss
                this.spawnParticles(this.boss.x, this.boss.y, '#ff0000', 15);
            }
        }

        // Check if boss 2 is in explosion radius
        if (this.boss2 && this.boss2.alive) {
            const distToBoss2 = Math.sqrt(
                Math.pow(bomb.x - this.boss2.x, 2) +
                Math.pow(bomb.y - this.boss2.y, 2)
            );

            // If boss 2 is within explosion radius, deal damage
            if (distToBoss2 <= radius) {
                this.boss2.takeDamage(100);
                // Extra particles for hitting boss
                this.spawnParticles(this.boss2.x, this.boss2.y, '#ff0000', 15);
            }
        }

        // Spawn explosion particles
        this.spawnParticles(bombX, bombY, '#ff6600', 20);
    }

    render() {
        // Fill background with black
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Fill sky (above surface level) with light blue
        const surfaceScreenY = SURFACE_LEVEL * BLOCK_SIZE - this.camera.y;
        if (surfaceScreenY > 0) {
            this.ctx.fillStyle = '#87CEEB'; // Light blue sky
            this.ctx.fillRect(0, 0, this.width, surfaceScreenY);
        }

        // Render world
        this.world.render(this.ctx, this.camera);

        // Render particles
        this.particles.forEach(particle => particle.render(this.ctx, this.camera));

        // Render bombs
        this.bombs.forEach(bomb => {
            // Render bomb itself
            bomb.render(this.ctx, this.camera);
        });

        // Render player
        this.player.render(this.ctx, this.camera);

        // Render boss 1
        if (this.boss) {
            this.boss.render(this.ctx, this.camera);
        }

        // Render boss 2
        if (this.boss2) {
            this.boss2.render(this.ctx, this.camera);
        }

        // Draw bomb trajectory preview (if player has arms, bombs, and slot 1 selected)
        const armsLevel = this.player.upgrades.arms || 0;
        if (armsLevel > 0 && this.player.bombs > 0 && this.player.selectedSlot === 1) {
            // Calculate throw velocity (same logic as throwBomb)
            const minThrowSpeed = 0.3;
            let throwVx = this.player.vx * 5;
            let throwVy = this.player.vy - 0.2;

            // Ensure minimum throw speed in horizontal direction
            if (Math.abs(throwVx) < minThrowSpeed) {
                if (this.player.vx > 0.01) {
                    throwVx = minThrowSpeed; // Throw right
                } else if (this.player.vx < -0.01) {
                    throwVx = -minThrowSpeed; // Throw left
                } else {
                    // Use last direction when stationary
                    throwVx = minThrowSpeed * this.player.lastDirection;
                }
            }

            throwVy = -0.1;

            if (throwVy > 0) {
                throwVy = -0.1;
            }

            // Draw trajectory preview line
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]); // Dashed line for preview
            this.ctx.beginPath();

            let px = this.player.x;
            let py = this.player.y;
            let pvx = throwVx;
            let pvy = throwVy;

            let startX = px * BLOCK_SIZE - this.camera.x;
            let startY = py * BLOCK_SIZE - this.camera.y;
            this.ctx.moveTo(startX, startY);

            // Simulate trajectory
            for (let i = 0; i < 100; i += 5) {
                px += pvx * 5;
                py += pvy * 5;
                pvy += 0.05 * 5;
                pvx *= 0.99;
                pvy *= 0.99;

                const screenX = px * BLOCK_SIZE - this.camera.x;
                const screenY = py * BLOCK_SIZE - this.camera.y;
                this.ctx.lineTo(screenX, screenY);

                // Stop if hit ground
                const blockX = Math.floor(px);
                const blockY = Math.floor(py);
                if (blockY >= 0 && blockY < WORLD_HEIGHT && blockX >= 0 && blockX < WORLD_WIDTH) {
                    const block = this.world.getBlock(blockX, blockY);
                    if (block && block.type !== BLOCK_TYPES.AIR) {
                        break;
                    }
                }
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset to solid line
        }

        // Render hotbar - number of slots = arms level (0 = no hotbar, 1 = 1 slot, 2 = 2 slots, etc.)
        if (armsLevel > 0) {
            const slotSize = 30;
            const slotSpacing = 5;
            const numSlots = armsLevel; // Number of slots = arms level
            const hotbarStartX = this.width / 2 - (slotSize * numSlots + slotSpacing * (numSlots - 1)) / 2;
            const hotbarY = this.height - 50;

            for (let slot = 1; slot <= numSlots; slot++) {
                const slotX = hotbarStartX + (slot - 1) * (slotSize + slotSpacing);

                // Slot background
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(slotX, hotbarY, slotSize, slotSize);

                // Slot border (highlighted if selected)
                if (this.player.selectedSlot === slot) {
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 3;
                } else {
                    this.ctx.strokeStyle = '#888';
                    this.ctx.lineWidth = 2;
                }
                this.ctx.strokeRect(slotX, hotbarY, slotSize, slotSize);

                // Draw slot number
                this.ctx.fillStyle = '#888';
                this.ctx.font = 'bold 10px monospace';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(slot, slotX + 3, hotbarY + 10);

                // Draw bomb icon in slot 1 if player has bombs
                if (slot === 1 && this.player.bombs > 0) {
                    // Draw bomb icon
                    this.ctx.fillStyle = '#000';
                    this.ctx.beginPath();
                    this.ctx.arc(slotX + 15, hotbarY + 15, 6, 0, Math.PI * 2);
                    this.ctx.fill();

                    // Draw fuse
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.beginPath();
                    this.ctx.arc(slotX + 11, hotbarY + 11, 2, 0, Math.PI * 2);
                    this.ctx.fill();

                    // Draw bomb count
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 10px monospace';
                    this.ctx.textAlign = 'right';
                    this.ctx.fillText(this.player.bombs, slotX + 27, hotbarY + 27);
                }
            }
        }
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

        // Drill upgrade needed for gold warning
        if (this.needsDrillUpgradeWarning) {
            const warning = document.createElement('div');
            warning.className = 'warning-message';
            warning.textContent = '⚠️ NEED DRILL UPGRADE FOR GOLD ⚠️';
            warning.style.background = 'rgba(255, 215, 0, 0.8)';
            warning.style.borderColor = '#FFD700';
            warningsContainer.appendChild(warning);
            shouldPlayWarning = true;
            // Reset flag after a short delay
            setTimeout(() => {
                this.needsDrillUpgradeWarning = false;
            }, 2000);
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

        // Robot Arms upgrade info
        const armsLevel = this.player.upgrades.arms || 0;
        const armsMaxLevel = 5;
        const armsBaseCost = 1000;
        const armsCost = armsBaseCost * Math.pow(2, armsLevel);
        const canUpgradeArms = armsLevel < armsMaxLevel && this.player.money >= armsCost;

        // Bomb restock cost (1 gold mineral from inventory)
        const needsBombRestock = this.player.bombs < this.player.maxBombs;
        const hasGoldInCargo = this.player.cargo.some(mineral => mineral.name === 'Gold');
        const canRestockBombs = needsBombRestock && hasGoldInCargo;

        let armsButtonHTML = '';
        if (armsLevel >= armsMaxLevel) {
            armsButtonHTML = `<button class="shop-btn" disabled>ROBOT ARMS - MAX LEVEL</button>`;
        } else {
            armsButtonHTML = `<button class="shop-btn" id="upgrade-arms-btn" ${!canUpgradeArms ? 'disabled' : ''}>
                ROBOT ARMS Lv.${armsLevel + 1} - $${armsCost}
            </button>`;
        }

        section.innerHTML = `
            <h3>REPAIR & ITEMS</h3>
            <button class="shop-btn" id="repair-hull-dynamic-btn" ${!canRepair ? 'disabled' : ''}>
                REPAIR HULL - $${repairCost}
            </button>
            <button class="shop-btn" id="restock-bombs-btn" ${!canRestockBombs ? 'disabled' : ''}>
                RESTOCK BOMBS - 1 Gold
            </button>
            ${armsButtonHTML}
            <div style="color: #888; margin-top: 10px;">
                Hull: ${Math.floor(this.player.hull)}/${this.player.maxHull}<br>
                Bombs: ${this.player.bombs}/${this.player.maxBombs}<br>
                Robot Arms: Level ${armsLevel}/${armsMaxLevel} (${armsLevel} slots)
            </div>
        `;

        const repairBtn = document.getElementById('repair-hull-dynamic-btn');
        const bombsBtn = document.getElementById('restock-bombs-btn');
        const armsBtn = document.getElementById('upgrade-arms-btn');

        if (repairBtn) repairBtn.addEventListener('click', () => this.repairHull());
        if (bombsBtn) bombsBtn.addEventListener('click', () => this.restockBombs());
        if (armsBtn) armsBtn.addEventListener('click', () => this.upgradeRobotArms());
    }

    upgradeRobotArms() {
        const armsLevel = this.player.upgrades.arms || 0;
        const armsMaxLevel = 5;
        const armsBaseCost = 1000;
        const armsCost = armsBaseCost * Math.pow(2, armsLevel);

        if (armsLevel < armsMaxLevel && this.player.money >= armsCost) {
            this.player.money -= armsCost;
            this.player.upgrades.arms = armsLevel + 1;
            this.audio.playCollect();
            this.updateShopUI();
        }
    }

    restockBombs() {
        // Find and remove 1 gold mineral from cargo
        if (this.player.bombs < this.player.maxBombs) {
            const goldIndex = this.player.cargo.findIndex(mineral => mineral.name === 'Gold');
            if (goldIndex !== -1) {
                // Remove the gold mineral from cargo
                const goldMineral = this.player.cargo.splice(goldIndex, 1)[0];
                this.player.cargoWeight -= goldMineral.weight;

                // Restock bombs
                this.player.bombs = this.player.maxBombs;
                this.audio.playCollect();
                this.updateShopUI();
            }
        }
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

        this.money = 10000; // Starting money
        this.upgrades = {};
        this.isOnSurface = false;

        // Movement stats (affected by upgrades)
        this.speed = 0.03; // Reduced from 0.04 for slower surface movement
        this.drillPower = 1;
        this.cooling = 0.5;
        this.bombs = 0; // Start with no bombs - must restock with gold first
        this.maxBombs = 3;
        this.lastDrillTime = 0;
        this.drillCooldown = 300; // 300ms between drills
        this.lastDirection = 1; // Track last horizontal direction (1 = right, -1 = left)
        this.selectedSlot = 0; // Hotbar slot selection (0 = none, 1-5 = slot number based on arms level)
        this.lastDamageTime = 0; // Track last time player took damage (for damage cooldown)

        // Fall damage tracking
        this.isFalling = false; // Track if currently in a fall
        this.fallStartY = 0; // Y position where fall started

        this.availableUpgrades = [
            { id: 'drill', name: 'Drill Power', description: 'Mine harder blocks (required for deep mining)', baseCost: 500, maxLevel: 5 },
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
            this.vx -= this.speed * 0.5; // Slower horizontal movement
            this.lastDirection = -1; // Remember left direction
            isThrusting = true;
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            this.vx += this.speed * 0.5; // Slower horizontal movement
            this.lastDirection = 1; // Remember right direction
            isThrusting = true;
        }
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            this.vy -= this.speed * 2.5; // Increased from 1.5 to overcome gravity (0.05)
            isThrusting = true;
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            this.drill(world, game);
            isThrusting = true; // Drilling also consumes fuel
        }

        // Hotbar slot selection (toggle on/off) - only allow selecting slots up to arms level
        const armsLevel = this.upgrades.arms || 0;
        if (keys['1'] && armsLevel >= 1) {
            this.selectedSlot = (this.selectedSlot === 1) ? 0 : 1;
            keys['1'] = false;
        }
        if (keys['2'] && armsLevel >= 2) {
            this.selectedSlot = (this.selectedSlot === 2) ? 0 : 2;
            keys['2'] = false;
        }
        if (keys['3'] && armsLevel >= 3) {
            this.selectedSlot = (this.selectedSlot === 3) ? 0 : 3;
            keys['3'] = false;
        }
        if (keys['4'] && armsLevel >= 4) {
            this.selectedSlot = (this.selectedSlot === 4) ? 0 : 4;
            keys['4'] = false;
        }
        if (keys['5'] && armsLevel >= 5) {
            this.selectedSlot = (this.selectedSlot === 5) ? 0 : 5;
            keys['5'] = false;
        }

        // Throw bomb with spacebar (requires arms upgrade and slot 1 selected)
        if (keys[' ']) {
            if (this.selectedSlot === 1) {
                this.throwBomb(game);
            }
            keys[' '] = false;
        }

        // Drop minerals with 'b' key
        if (keys['b'] || keys['B']) {
            this.dropMinerals();
            keys['b'] = false;
            keys['B'] = false;
        }

        // Fall damage tracking - track falling without thrust
        const isThrustingUp = keys['ArrowUp'] || keys['w'] || keys['W'];

        // Start tracking fall when falling without thrusting up
        if (this.vy > 0.1 && !isThrustingUp && !this.isFalling) {
            this.isFalling = true;
            this.fallStartY = this.y;
        }

        // If player thrusts upward during fall, restart fall measurement from current position
        if (isThrustingUp && this.isFalling) {
            this.fallStartY = this.y; // Reset fall start to current position
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
        this.handleVerticalCollisions(world, game);

        // Collision with world boundaries
        // Allow player to reach edge blocks (need to be at x=0.5 for block 0, x=59.5 for block 59)
        if (this.x < 0.5) {
            this.x = 0.5;
            this.vx = 0;
        }
        if (this.x > WORLD_WIDTH - 0.5) {
            this.x = WORLD_WIDTH - 0.5;
            this.vx = 0;
        }
        // Allow flying in the sky - limit how high you can go
        if (this.y < -30) {
            this.y = -30; // Can fly 30 blocks above world top
            this.vy = 0;
        }
        if (this.y > WORLD_HEIGHT - 2) {
            this.y = WORLD_HEIGHT - 2;
            this.vy = 0;
        }

        // Fuel consumption - when using WASD/arrow keys
        if (isThrusting) {
            const fuelConsumption = 0.05 + Math.abs(this.vx) * 0.01 + Math.abs(this.vy) * 0.01;
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

            if (block && block.type !== BLOCK_TYPES.AIR && block.type !== BLOCK_TYPES.UNBREAKABLE && block.type !== BLOCK_TYPES.BOMB_ROCK) {
                const hardness = this.getBlockHardness(block.type);

                if (this.drillPower >= hardness) {
                    // Gold minerals require drill level 1 upgrade (drillPower >= 2)
                    if (block.mineral && block.mineral.name === 'Gold' && this.drillPower < 2) {
                        game.needsDrillUpgradeWarning = true; // Show warning to player
                        return false; // Can't drill gold without drill upgrade
                    }

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

                        // SOLID horizontal collision - player visual size is 20px (1.0 blocks)
                        // Collision threshold: 0.5 (block radius) + 0.5 (player visual radius) = 1.0
                        if (distX < 1.0 && distY < 1.0) {
                            const overlapX = 1.0 - distX;
                            const overlapY = 1.0 - distY;

                            // Resolve horizontally ONLY if horizontal overlap is smaller
                            // This prevents resolving ground collision horizontally
                            if (overlapX > 0.001 && overlapX < overlapY) {
                                // Push horizontally away from block center
                                this.x += (this.x > blockCenterX ? overlapX : -overlapX);
                                // Only stop velocity if moving INTO the wall
                                if ((this.vx > 0 && this.x > blockCenterX) || (this.vx < 0 && this.x < blockCenterX)) {
                                    this.vx = 0;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    handleVerticalCollisions(world, game) {
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

                        // Vertical collision check - player visual size is 20px (1.0 blocks)
                        // Collision threshold: 0.5 (block radius) + 0.5 (player visual radius) = 1.0
                        if (distX < 1.0 && distY < 1.0) {
                            const overlapX = 1.0 - distX;
                            const overlapY = 1.0 - distY;

                            // Only resolve vertically if vertical overlap is smaller OR equal
                            if (overlapY > 0.001 && overlapY <= overlapX) {
                                // Push vertically away from block center
                                this.y += (this.y > blockCenterY ? overlapY : -overlapY);

                                // Only stop downward velocity when landing on top of block
                                // When landing on top: player y < block center y (player is above block)
                                if (this.vy > 0 && this.y < blockCenterY) {
                                    // Fall damage based on distance fallen without thrust
                                    if (this.isFalling && this.fallStartY > 0) {
                                        const fallDistance = this.y - this.fallStartY; // In blocks
                                        const fallMeters = fallDistance * 5; // Convert to meters (each block = 5m)

                                        // Apply damage if fell more than 10 meters (2 blocks)
                                        if (fallMeters > 10) {
                                            const fallDamage = (fallMeters - 10) * 0.5; // 0.5 damage per meter after 10m
                                            this.hull -= fallDamage;

                                            // Visual feedback
                                            if (game) {
                                                game.spawnParticles(this.x, this.y, '#ff4400', Math.min(30, Math.floor(fallMeters / 2)));
                                            }
                                        }

                                        // Reset fall tracking
                                        this.isFalling = false;
                                        this.fallStartY = 0;
                                    }
                                    this.vy = 0;
                                } else if (this.vy < 0 && this.y > blockCenterY) {
                                    // Hitting ceiling from below: player y > block center y (player is below block)
                                    this.vy = 0;
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

    throwBomb(game) {
        // Can only throw bombs if you have the arms upgrade
        if (!this.upgrades.arms) {
            return;
        }

        if (this.bombs > 0) {
            this.bombs--;

            // Calculate throw velocity based on movement direction
            const minThrowSpeed = 0.3; // Minimum throw speed
            let throwVx = this.vx * 5; // Amplify horizontal velocity
            let throwVy = this.vy - 0.2; // Throw slightly upward

            // Ensure minimum throw speed in horizontal direction
            if (Math.abs(throwVx) < minThrowSpeed) {
                // Use sign of vx to determine direction, or use last direction if stationary
                if (this.vx > 0.01) {
                    throwVx = minThrowSpeed; // Throw right
                } else if (this.vx < -0.01) {
                    throwVx = -minThrowSpeed; // Throw left
                } else {
                    // If stationary, use last direction
                    throwVx = minThrowSpeed * this.lastDirection;
                }
            }

            // Set default upward arc
            throwVy = -0.1;

            // Never allow downward throws
            if (throwVy > 0) {
                throwVy = -0.1;
            }

            // Create and add bomb to game
            const bomb = new Bomb(this.x, this.y, throwVx, throwVy);
            game.bombs.push(bomb);
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
        // Engine - reduced upgrade effect
        this.speed = 0.03 + (this.upgrades.engine || 0) * 0.006;

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

        // Draw arms (only if purchased)
        if (this.upgrades.arms) {
            ctx.fillStyle = '#666';
            // Left arm
            ctx.fillRect(screenX - 13, screenY - 2, 3, 8);
            // Right arm
            ctx.fillRect(screenX + 10, screenY - 2, 3, 8);
        }

        // Draw drill as triangle (shakes when drilling)
        // Drill color changes based on upgrade level
        const drillLevel = this.upgrades.drill || 0;
        const drillColors = [
            '#888',    // Level 0: Gray (basic)
            '#a0a0ff', // Level 1: Light blue (iron)
            '#00ff00', // Level 2: Green (emerald)
            '#ffaa00', // Level 3: Gold
            '#ff00ff', // Level 4: Magenta (ruby)
            '#00ffff'  // Level 5: Cyan (diamond)
        ];
        ctx.fillStyle = drillColors[drillLevel];

        // Check if currently drilling (within cooldown period)
        const isDrilling = Date.now() - this.lastDrillTime < this.drillCooldown;

        // Add shake effect when drilling
        const shakeX = isDrilling ? (Math.random() - 0.5) * 3 : 0;
        const shakeY = isDrilling ? (Math.random() - 0.5) * 2 : 0;

        // Draw triangle drill bit
        ctx.beginPath();
        ctx.moveTo(screenX - 6 + shakeX, screenY + 10 + shakeY); // Left corner
        ctx.lineTo(screenX + 6 + shakeX, screenY + 10 + shakeY); // Right corner
        ctx.lineTo(screenX + shakeX, screenY + 18 + shakeY); // Bottom point
        ctx.closePath();
        ctx.fill();

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
            maxBombs: this.maxBombs,
            lastDirection: this.lastDirection,
            selectedSlot: this.selectedSlot
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

        // SHOP PLATFORMS - 2 UNBREAKABLE blocks under each shop at surface level
        if (y === SURFACE_LEVEL) {
            // FUEL shop at x=10: blocks (9,5) and (10,5)
            if (x === 9 || x === 10) {
                return { type: BLOCK_TYPES.UNBREAKABLE, mineral: null };
            }
            // SELL shop at x=20: blocks (19,5) and (20,5)
            if (x === 19 || x === 20) {
                return { type: BLOCK_TYPES.UNBREAKABLE, mineral: null };
            }
            // UPGRADE shop at x=40: blocks (39,5) and (40,5)
            if (x === 39 || x === 40) {
                return { type: BLOCK_TYPES.UNBREAKABLE, mineral: null };
            }
            // REPAIR shop at x=50: blocks (49,5) and (50,5)
            if (x === 49 || x === 50) {
                return { type: BLOCK_TYPES.UNBREAKABLE, mineral: null };
            }
        }

        // BOSS ARENA 1 at depth 500m (y = 105-115) - FULL WIDTH CHAMBER
        // Depth calculation: (y - SURFACE_LEVEL) * 5 = depth in meters
        // So for 500m: (y - 5) * 5 = 500 → y = 105
        const boss1Depth = 100; // y offset from surface
        const boss1Y = SURFACE_LEVEL + boss1Depth; // y = 105

        // Create full-width boss 1 arena chamber (entire playable area, 10 blocks tall)
        if (y >= boss1Y && y <= boss1Y + 10 && x >= 0 && x < WORLD_WIDTH) {
            // Arena floor (UNBREAKABLE - can't be destroyed until boss defeated)
            if (y === boss1Y + 10) {
                return { type: BLOCK_TYPES.UNBREAKABLE, mineral: null };
            }
            // Arena ceiling (BOMB_ROCK for visual distinction)
            if (y === boss1Y) {
                return { type: BLOCK_TYPES.BOMB_ROCK, mineral: null };
            }
            // Arena air space (big open room for boss fight)
            return { type: BLOCK_TYPES.AIR, mineral: null };
        }

        // BOSS ARENA 2 at depth 2000m (y = 405-415) - FULL WIDTH CHAMBER
        // For 2000m: (y - 5) * 5 = 2000 → y = 405
        const boss2Depth = 400; // y offset from surface
        const boss2Y = SURFACE_LEVEL + boss2Depth; // y = 405

        // Create full-width boss 2 arena chamber (entire playable area, 10 blocks tall)
        if (y >= boss2Y && y <= boss2Y + 10 && x >= 0 && x < WORLD_WIDTH) {
            // Arena floor (UNBREAKABLE - can't be destroyed until boss defeated)
            if (y === boss2Y + 10) {
                return { type: BLOCK_TYPES.UNBREAKABLE, mineral: null };
            }
            // Arena ceiling (BOMB_ROCK for visual distinction)
            if (y === boss2Y) {
                return { type: BLOCK_TYPES.BOMB_ROCK, mineral: null };
            }
            // Arena air space (big open room for boss fight)
            return { type: BLOCK_TYPES.AIR, mineral: null };
        }

        // CAVE GENERATION - Random air pockets underground
        const depth = y - SURFACE_LEVEL;

        // Create random caves/air pockets at various depths (increased for more caves)
        let caveProbability = 0;
        if (depth > 10 && depth < 100) {
            caveProbability = 0.10; // 10% chance shallow caves (was 3%)
        } else if (depth >= 100 && depth < 500) {
            caveProbability = 0.12; // 12% chance medium caves (was 5%)
        } else if (depth >= 500 && depth < 2000) {
            caveProbability = 0.10; // 10% chance deep caves (was 4%)
        } else if (depth >= 2000) {
            caveProbability = 0.08; // 8% chance very deep caves (was 3%)
        }

        // Random cave generation
        if (Math.random() < caveProbability) {
            return { type: BLOCK_TYPES.AIR, mineral: null };
        }

        // Determine block type based on depth
        let blockType;

        if (depth < 500) {
            // All shallow and medium depth: SOFT_EARTH only
            blockType = BLOCK_TYPES.SOFT_EARTH;
        } else {
            // Deep mining (500+) - EXACTLY 2 BOMB_ROCK per line
            // Calculate deterministic positions for BOMB_ROCK based on y
            const bombPos1 = (y * 17) % WORLD_WIDTH;
            const bombPos2 = (y * 23 + 7) % WORLD_WIDTH;

            if (x === bombPos1 || x === bombPos2) {
                blockType = BLOCK_TYPES.BOMB_ROCK; // Exactly 2 per line
            } else {
                // Rest are SOFT_EARTH
                blockType = BLOCK_TYPES.SOFT_EARTH;
            }
        }

        // Determine mineral
        let mineral = null;
        if (blockType !== BLOCK_TYPES.AIR && blockType !== BLOCK_TYPES.BOMB_ROCK) {
            mineral = this.generateMineral(depth);
        }

        return { type: blockType, mineral };
    }

    generateMineral(depth) {
        const rand = Math.random();

        // Define mineral probability based on depth
        // null = dirt (can dig but not collect)
        // Minerals: Bronze, Silver, Gold, Emerald, Diamond (Iron removed)
        // Deeper = less dirt, rarer minerals more common

        // Shallow (0-110) - 84.5% dirt, 14% bronze, 1% silver, 0.5% gold
        // This is before the boss arena (depth 110 = y 115 = boss floor)
        if (depth < 110) {
            if (rand < 0.845) return null; // 84.5% dirt
            if (rand < 0.985) return MINERALS.BRONZE; // 14% bronze
            if (rand < 0.995) return MINERALS.SILVER; // 1% silver
            return MINERALS.GOLD; // 0.5% gold
        }

        // Post-Boss (110-500) - Right after boss floor, diamonds start appearing at 1%
        // 84% dirt, 13% bronze, 1% silver, 1% gold, 1% diamond (no emerald before 2000m)
        if (depth < 500) {
            if (rand < 0.84) return null; // 84% dirt
            if (rand < 0.97) return MINERALS.BRONZE; // 13% bronze
            if (rand < 0.98) return MINERALS.SILVER; // 1% silver
            if (rand < 0.99) return MINERALS.GOLD; // 1% gold
            return MINERALS.DIAMOND; // 1% diamond
        }

        // Medium (500-2000) - 78% dirt, 10% bronze, 10% silver, 1% gold, 1% diamond
        // No emerald before 2000m depth (boss 2 location)
        if (depth < 2000) {
            if (rand < 0.78) return null; // 78% dirt
            if (rand < 0.88) return MINERALS.BRONZE; // 10% bronze
            if (rand < 0.98) return MINERALS.SILVER; // 10% silver
            if (rand < 0.99) return MINERALS.GOLD; // 1% gold
            return MINERALS.DIAMOND; // 1% diamond
        }

        // Deep (2000-5000) - Little dirt, Bronze, Silver, Gold, Emerald
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

                const screenX = x * BLOCK_SIZE - camera.x;
                const screenY = y * BLOCK_SIZE - camera.y;

                // Render sky (air above surface) as light blue
                if ((!block || block.type === BLOCK_TYPES.AIR) && y < SURFACE_LEVEL) {
                    ctx.fillStyle = '#87CEEB'; // Light blue sky
                    ctx.fillRect(screenX, screenY, BLOCK_SIZE, BLOCK_SIZE);
                    continue;
                }

                // Skip underground air (caves)
                if (!block || block.type === BLOCK_TYPES.AIR) continue;

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
                        case BLOCK_TYPES.BOMB_ROCK:
                            color = '#404040'; // Dark gray - indicates bomb-only
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

                // Draw glow effect for minerals to make them stand out
                if (block.mineral && block.type !== BLOCK_TYPES.UNBREAKABLE) {
                    // Bright border/outline
                    ctx.strokeStyle = block.mineral.color;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(screenX + 1, screenY + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

                    // Subtle inner glow
                    ctx.globalAlpha = 0.3;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(screenX + 2, screenY + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
                    ctx.globalAlpha = 1.0;
                }

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

        // Draw shops as unique buildings on surface
        for (const [shopType, shop] of Object.entries(SHOPS)) {
            const shopScreenX = shop.x * BLOCK_SIZE - camera.x;
            const shopScreenY = shop.y * BLOCK_SIZE - camera.y;

            if (shopType === 'FUEL') {
                // FUEL STATION - Gas pump style
                ctx.fillStyle = '#00ff00'; // Green base
                ctx.fillRect(shopScreenX - 18, shopScreenY - 30, 36, 30);

                // Pump
                ctx.fillStyle = '#00cc00';
                ctx.fillRect(shopScreenX - 8, shopScreenY - 25, 16, 20);

                // Pump nozzle
                ctx.fillStyle = '#000';
                ctx.fillRect(shopScreenX + 8, shopScreenY - 18, 8, 4);

                // Sign
                ctx.fillStyle = '#fff';
                ctx.fillRect(shopScreenX - 16, shopScreenY - 38, 32, 12);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('FUEL', shopScreenX, shopScreenY - 29);

            } else if (shopType === 'SELL') {
                // TRADING POST - Market stall style
                ctx.fillStyle = '#ffff00'; // Yellow awning
                ctx.fillRect(shopScreenX - 22, shopScreenY - 35, 44, 8);

                // Stall base
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(shopScreenX - 20, shopScreenY - 27, 40, 27);

                // Counter
                ctx.fillStyle = '#654321';
                ctx.fillRect(shopScreenX - 20, shopScreenY - 20, 40, 5);

                // Display boxes
                ctx.fillStyle = '#CD7F32';
                ctx.fillRect(shopScreenX - 15, shopScreenY - 15, 8, 8);
                ctx.fillRect(shopScreenX - 3, shopScreenY - 15, 8, 8);
                ctx.fillRect(shopScreenX + 9, shopScreenY - 15, 8, 8);

                // Sign
                ctx.fillStyle = '#fff';
                ctx.fillRect(shopScreenX - 16, shopScreenY - 40, 32, 12);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('SELL', shopScreenX, shopScreenY - 31);

            } else if (shopType === 'UPGRADE') {
                // UPGRADE CENTER - Workshop style
                ctx.fillStyle = '#00aaff'; // Blue walls
                ctx.fillRect(shopScreenX - 20, shopScreenY - 32, 40, 32);

                // Roof
                ctx.fillStyle = '#0088cc';
                ctx.fillRect(shopScreenX - 22, shopScreenY - 35, 44, 5);

                // Large garage door
                ctx.fillStyle = '#666';
                ctx.fillRect(shopScreenX - 14, shopScreenY - 24, 28, 24);

                // Door segments
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 1;
                for (let i = 0; i < 4; i++) {
                    ctx.strokeRect(shopScreenX - 14, shopScreenY - 24 + i * 6, 28, 6);
                }

                // Sign
                ctx.fillStyle = '#fff';
                ctx.fillRect(shopScreenX - 22, shopScreenY - 43, 44, 12);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('UPGRADE', shopScreenX, shopScreenY - 34);

            } else if (shopType === 'REPAIR') {
                // REPAIR SHOP - Tool shop style
                ctx.fillStyle = '#ff9900'; // Orange walls
                ctx.fillRect(shopScreenX - 18, shopScreenY - 30, 36, 30);

                // Window/display
                ctx.fillStyle = '#87CEEB';
                ctx.fillRect(shopScreenX - 14, shopScreenY - 24, 12, 12);
                ctx.fillRect(shopScreenX + 2, shopScreenY - 24, 12, 12);

                // Door
                ctx.fillStyle = '#654321';
                ctx.fillRect(shopScreenX - 6, shopScreenY - 10, 12, 10);

                // Tools on display (wrench symbol)
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(shopScreenX - 8, shopScreenY - 20);
                ctx.lineTo(shopScreenX - 4, shopScreenY - 16);
                ctx.stroke();

                // Sign
                ctx.fillStyle = '#fff';
                ctx.fillRect(shopScreenX - 20, shopScreenY - 39, 40, 12);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('REPAIR', shopScreenX, shopScreenY - 30);
            }
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

        // Fill mountains: All sky outside playable area + underground walls
        // Mountains extend infinitely upward (no limit)
        for (let y = startY; y < endY; y++) {
            const screenY = y * BLOCK_SIZE - camera.y;

            if (y < SURFACE_LEVEL) {
                // In the sky - fill everything outside playable area
                // Left side: everything left of x=0
                for (let x = startX; x < 0 && x < endX; x++) {
                    const screenX = x * BLOCK_SIZE - camera.x;
                    drawRockBlock(screenX, screenY, y);
                }
                // Right side: everything right of x=60
                for (let x = Math.max(WORLD_WIDTH, startX); x < endX; x++) {
                    const screenX = x * BLOCK_SIZE - camera.x;
                    drawRockBlock(screenX, screenY, y);
                }
            } else if (y >= SURFACE_LEVEL) {
                // Underground - vertical walls from surface down
                // Left wall
                for (let x = startX; x < 0 && x < endX; x++) {
                    const screenX = x * BLOCK_SIZE - camera.x;
                    drawRockBlock(screenX, screenY, y);
                }
                // Right wall
                for (let x = Math.max(WORLD_WIDTH, startX); x < endX; x++) {
                    const screenX = x * BLOCK_SIZE - camera.x;
                    drawRockBlock(screenX, screenY, y);
                }
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
