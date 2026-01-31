// Game Variables
let score = 0;
let miningPower = 1;
let miners = 1;
let miningSpeed = 1.0;
let gameInterval;
let mineSpots = [];
let totalMined = 0;
let totalClaimed = 0;
let totalWithdrawn = 0;
let claimableBalance = 0;
let walletTokenBalance = 0;

// Game Statistics
let bestSession = 0;
let miningStartTime = Date.now();
let coinsPerSecond = 0;

// Initialize Game
function initGame() {
    console.log('Initializing game...');
    
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    createMineSpots(canvas);
    
    // Clear any existing interval
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    
    gameInterval = setInterval(() => updateGame(canvas), 1000 / miningSpeed);
    updateGameUI();
    
    // Add click listener
    canvas.addEventListener('click', handleCanvasClick);
    
    console.log('Game initialized successfully');
}

// Create Mine Spots
function createMineSpots(canvas) {
    mineSpots = [];
    const spotCount = 5;
    const margin = 40;
    
    for (let i = 0; i < spotCount; i++) {
        mineSpots.push({
            x: Math.random() * (canvas.width - margin * 2) + margin,
            y: Math.random() * (canvas.height - margin * 2) + margin,
            active: true,
            size: 10 + Math.random() * 10
        });
    }
}

// Update Game
function updateGame(canvas) {
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw mine spots with glow effect
    mineSpots.forEach(spot => {
        if (spot.active) {
            // Outer glow
            ctx.shadowColor = '#f8c555';
            ctx.shadowBlur = 20;
            ctx.fillStyle = 'rgba(248, 197, 85, 0.8)';
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, spot.size + 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner core with gradient
            const innerGradient = ctx.createRadialGradient(
                spot.x, spot.y, 0,
                spot.x, spot.y, spot.size
            );
            innerGradient.addColorStop(0, '#ffdd59');
            innerGradient.addColorStop(1, '#f8c555');
            ctx.shadowBlur = 0;
            ctx.fillStyle = innerGradient;
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, spot.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Pulsing effect
            if (Math.random() < 0.1) {
                ctx.shadowColor = '#ffdd59';
                ctx.shadowBlur = 30;
                ctx.beginPath();
                ctx.arc(spot.x, spot.y, spot.size + 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    });
    
    // Auto mining
    mineSpots.forEach(spot => {
        if (spot.active && Math.random() < 0.3) {
            const mined = miningPower * miners;
            score += mined;
            totalMined += mined;
            claimableBalance += mined;
            
            // Update mining efficiency
            const timeElapsed = (Date.now() - miningStartTime) / 1000;
            coinsPerSecond = totalMined / timeElapsed;
            
            updateGameUI();
            showParticle(spot.x, spot.y);
        }
    });
}

// Handle Canvas Click
function handleCanvasClick(e) {
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    mineSpots.forEach((spot, index) => {
        const distance = Math.sqrt((x - spot.x) ** 2 + (y - spot.y) ** 2);
        const clickRadius = spot.size + 10;
        
        if (distance < clickRadius && spot.active) {
            const minedAmount = miningPower * 10;
            score += minedAmount;
            totalMined += minedAmount;
            claimableBalance += minedAmount;
            
            // Update best session
            if (score > bestSession) {
                bestSession = score;
            }
            
            // Update mining efficiency
            const timeElapsed = (Date.now() - miningStartTime) / 1000;
            coinsPerSecond = totalMined / timeElapsed;
            
            spot.active = false;
            
            // Create particle explosion
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    showParticle(
                        spot.x + Math.random() * 40 - 20,
                        spot.y + Math.random() * 40 - 20
                    );
                }, i * 100);
            }
            
            // Respawn mine spot
            setTimeout(() => {
                mineSpots[index] = {
                    x: Math.random() * (canvas.width - 80) + 40,
                    y: Math.random() * (canvas.height - 80) + 40,
                    active: true,
                    size: 10 + Math.random() * 10
                };
            }, 1000);
            
            updateGameUI();
            
            // Show notification with animation
            const notification = document.createElement('div');
            notification.className = 'mining-notification';
            notification.textContent = `+${minedAmount} MTK`;
            notification.style.left = `${e.clientX - rect.left}px`;
            notification.style.top = `${e.clientY - rect.top}px`;
            canvas.parentElement.appendChild(notification);
            
            setTimeout(() => notification.remove(), 1000);
            
            // Add to activity log
            addActivity('Mined Coins', `+${minedAmount} MTK`);
        }
    });
}

// Show Particle Effect
function showParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'mine-spot';
    particle.style.cssText = `
        position: absolute;
        width: 20px;
        height: 20px;
        background: #f8c555;
        border-radius: 50%;
        left: ${x - 10}px;
        top: ${y - 10}px;
        pointer-events: none;
        z-index: 100;
        animation: pulse 0.5s ease-out forwards;
    `;
    
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.appendChild(particle);
        setTimeout(() => particle.remove(), 500);
    }
}

// Update Game UI
function updateGameUI() {
    // Update main display
    updateElement('score', score);
    updateElement('multiplier', `${miningPower}x`);
    updateElement('miners', miners);
    updateElement('speed', miningSpeed.toFixed(1));
    updateElement('totalMined', totalMined);
    updateElement('totalClaimed', totalClaimed);
    updateElement('totalWithdrawn', totalWithdrawn);
    updateElement('gameBalance', score);
    updateElement('claimableBalance', claimableBalance);
    updateElement('claimableAmount', `${claimableBalance} available`);
    updateElement('walletTokenBalance', walletTokenBalance);
    
    // Update stats section
    updateElement('totalEarnings', `${totalMined} MTK`);
    updateElement('statsWalletBalance', `${walletTokenBalance} MTK`);
    updateElement('miningEfficiency', `${coinsPerSecond.toFixed(2)} MTK/s`);
    updateElement('bestSession', `${bestSession} MTK`);
    
    // Update charts
    if (typeof updateCharts === 'function') {
        updateCharts();
    }
}

// Update Element Helper
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Game Functions
function upgradeMiningPower() {
    if (score >= 100) {
        score -= 100;
        miningPower++;
        updateGameUI();
        showNotification('⚡ Mining power upgraded!', 'success');
        addActivity('Upgraded', 'Mining Power +1');
    } else {
        showNotification('Not enough MTK!', 'error');
    }
}

function buyMiner() {
    if (score >= 500) {
        score -= 500;
        miners++;
        updateGameUI();
        showNotification('👷 New miner purchased!', 'success');
        addActivity('Purchased', 'New Miner');
    } else {
        showNotification('Not enough MTK!', 'error');
    }
}

function upgradeSpeed() {
    if (score >= 250) {
        score -= 250;
        miningSpeed += 0.5;
        
        // Update game interval
        clearInterval(gameInterval);
        gameInterval = setInterval(() => {
            const canvas = document.getElementById('gameCanvas');
            if (canvas) updateGame(canvas);
        }, 1000 / miningSpeed);
        
        updateGameUI();
        showNotification('🚀 Mining speed increased!', 'success');
        addActivity('Upgraded', 'Mining Speed');
    } else {
        showNotification('Not enough MTK!', 'error');
    }
}

function claimTokens() {
    if (claimableBalance <= 0) {
        showNotification('No tokens to claim!', 'error');
        return;
    }
    
    const claimedAmount = claimableBalance;
    walletTokenBalance += claimedAmount;
    totalClaimed += claimedAmount;
    claimableBalance = 0;
    score = 0;
    
    updateGameUI();
    showNotification(`✅ Claimed ${claimedAmount} MTK to wallet!`, 'success');
    addActivity('Claimed', `${claimedAmount} MTK`);
}

// Add Activity to Log
function addActivity(title, description) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    activityItem.innerHTML = `
        <div class="activity-icon">
            <i class="fas fa-coins"></i>
        </div>
        <div class="activity-content">
            <div class="activity-title">${title}</div>
            <div class="activity-time">${time}</div>
        </div>
        <div class="activity-amount">${description}</div>
    `;
    
    activityList.insertBefore(activityItem, activityList.firstChild);
    
    // Limit to 10 activities
    const items = activityList.querySelectorAll('.activity-item');
    if (items.length > 10) {
        activityList.removeChild(items[items.length - 1]);
    }
}

// Export functions
window.initGame = initGame;
window.upgradeMiningPower = upgradeMiningPower;
window.buyMiner = buyMiner;
window.upgradeSpeed = upgradeSpeed;
window.claimTokens = claimTokens;

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    // Start game after a short delay
    setTimeout(() => {
        if (document.getElementById('gameCanvas')) {
            initGame();
        }
    }, 500);
});