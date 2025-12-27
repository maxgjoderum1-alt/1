# MOTHERLOAD - Mining Game

A browser-based mining game inspired by the classic flash game Motherload. Dig deep into the planet, collect valuable minerals, upgrade your vehicle, and discover the secrets buried at the core.

**✨ IMPROVED VERSION** - Now with enhanced mechanics, visual effects, audio feedback, and better balance!

## 🎮 How to Play

1. Open `index.html` in a web browser
2. Click "NEW GAME" to start
3. Use arrow keys to navigate and mine
4. Return to the surface to sell minerals and upgrade

## 🕹️ Controls

- **Arrow Up** - Move up (uses fuel)
- **Arrow Down** - Drill downward
- **Arrow Left/Right** - Move horizontally
- **Spacebar** - Drop minerals (reduce cargo weight)
- **B** - Use bomb (destroys multiple blocks)

## 🚗 Vehicle Stats

Your mining vehicle has four critical stats to manage:

- **FUEL** - Depletes as you move and drill. Game over if it reaches 0.
- **HULL** - Your vehicle's health. Damage from collisions and overheating.
- **HEAT** - Increases with depth and drilling. Causes hull damage when maxed.
- **CARGO** - Weight of minerals collected. Return to surface to sell.

## 💎 Minerals

Find increasingly valuable minerals as you dig deeper:

- **Dirt** - $1 (common everywhere)
- **Coal** - $5 (depth 10m+)
- **Copper** - $15 (depth 20m+)
- **Iron** - $30 (depth 40m+)
- **Silver** - $75 (depth 60m+)
- **Gold** - $150 (depth 80m+)
- **Diamond** - $500 (depth 100m+)
- **Alien Artifacts** - $1000 (depth 140m+, very rare)

## 🏪 Surface Base

Return to the surface (fly upward above the green line) to access the shop:

### Services
- **Sell All Cargo** - Convert minerals to money
- **Repair Hull** - $2 per hull point
- **Refuel** - $0.50 per fuel unit

### Upgrades
- **Engine** - Faster movement speed
- **Drill** - Mine harder blocks
- **Fuel Tank** - Increased fuel capacity
- **Cargo Bay** - Carry more minerals
- **Hull Armor** - More hit points
- **Cooling System** - Better heat resistance
- **Bomb Capacity** - Carry more bombs

Each upgrade has 3-5 levels. Costs double with each level.

## 🎯 Game Objectives

1. **Survive** - Manage fuel, hull, and heat carefully
2. **Profit** - Mine valuable minerals and sell them
3. **Upgrade** - Improve your vehicle to reach deeper
4. **Discover** - Reach the planet's core (180m depth) to win

## ⚠️ Hazards

- **Depth** - Heat increases with depth
- **Hard Rocks** - Require drill upgrades to mine
- **Unbreakable Blocks** - Cannot be mined (marked with red outline)
- **Collisions** - Fast impacts damage hull
- **Overheating** - Max heat causes continuous hull damage

## 🧨 Bombs

Bombs destroy a 2-block radius around you. Use them to:
- Clear tough rock quickly
- Create escape routes
- Access blocked areas
- Bombs restock automatically on the surface

## 💾 Save System

Your progress is automatically saved using localStorage:
- Game saves periodically during play
- "CONTINUE" button appears if save exists
- Game over or victory clears the save

## 🏁 Victory Condition

Reach a depth of 180 meters (900m displayed) to discover the alien civilization at the planet's core and win the game!

## 🛠️ Technical Details

- Pure HTML5/CSS/JavaScript
- Canvas-based rendering
- Procedural terrain generation
- Pixel-art aesthetic
- No external dependencies
- Works offline

## 📋 Features Implemented

✅ 2D side-view mining gameplay
✅ Heavy momentum-based controls
✅ Fuel, hull, heat, and cargo management
✅ Procedurally generated terrain
✅ 8 different mineral types
✅ Full upgrade system (7 categories)
✅ Bomb mechanics with auto-restock
✅ Risk/reward depth system
✅ Surface base with shop
✅ Auto-save functionality
✅ Game over and victory conditions
✅ Pixel-art graphics
✅ Flash-era visual style

## ✨ Enhanced Features

🎨 **Visual Polish**
- Particle effects when mining blocks
- Explosion particles for bombs
- Heat glow effect on vehicle
- Damage flash animation
- Cargo weight indicator
- Mineral color-coded blocks

🔊 **Audio Feedback**
- Drilling sound effects
- Mineral collection chimes
- Bomb explosions
- Warning beeps for low fuel/overheat

⚠️ **Improved Warnings**
- Low fuel alert
- Cargo full notification
- Overheating warning
- Real-time status indicators
- Bomb counter display

⚙️ **Gameplay Improvements**
- Sideways drilling capability
- Better collision detection
- Improved heat mechanics
- Balanced mineral distribution
- Smarter cargo management
- Starting money ($50)
- Enhanced upgrade progression

## 🎨 Design Philosophy

The game captures the essence of the original Motherload:
- **Resource Management** - Balancing fuel, health, and cargo
- **Risk vs Reward** - Going deeper = better minerals but more danger
- **Progression Loop** - Mine → Sell → Upgrade → Mine Deeper
- **Strategic Planning** - When to return, what to upgrade, where to dig

## 🔧 Bug Fixes & Improvements

**Fixed Issues:**
- ✅ Bomb restocking now works correctly (restocks at shop, not during use)
- ✅ Heat mechanics properly balanced (depth heat vs cooling)
- ✅ Collision damage only on high-speed impacts
- ✅ Mineral generation fixed (proper depth-based distribution)
- ✅ Cargo overflow handled gracefully
- ✅ Sideways drilling added for better mobility
- ✅ Fuel consumption balanced
- ✅ Upgrade costs reordered by importance

**Balance Changes:**
- Heat gain reduced from 0.02 to 0.015 per depth unit
- Fuel consumption reduced from 0.05 to 0.04 base
- Drilling fuel cost reduced from 0.2 to 0.15
- Shop heat reduction increased from 20 to 30
- Collision damage now speed-based (0.5x speed when > 1.2)
- Starting money increased to $50

Enjoy your mining adventure! 🚀⛏️
