// Main Application Script
document.addEventListener('DOMContentLoaded', function() {
    console.log('MTK Miner Game Loading...');
    
    // Navigation handling
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            this.classList.add('active');
            const targetId = this.getAttribute('href').substring(1);
            document.getElementById(targetId).classList.add('active');
            
            document.querySelector('.main-container').scrollTop = 0;
        });
    });
    
    // Initialize game
    if (typeof initGame === 'function') {
        setTimeout(() => {
            initGame();
        }, 500);
    }
    
    // Auto-initialize blockchain
    setTimeout(async () => {
        if (typeof initWeb3 === 'function') {
            await initWeb3();
        }
    }, 1000);
    
    // Initialize charts
    if (typeof Chart !== 'undefined') {
        initCharts();
    }
});

// Initialize charts
function initCharts() {
    const miningCtx = document.getElementById('miningChart')?.getContext('2d');
    if (miningCtx) {
        window.miningChart = new Chart(miningCtx, {
            type: 'line',
            data: {
                labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
                datasets: [{
                    label: 'MTK Mined',
                    data: [100, 200, 150, 300, 250],
                    borderColor: '#f8c555',
                    backgroundColor: 'rgba(248, 197, 85, 0.1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }
    
    const distributionCtx = document.getElementById('distributionChart')?.getContext('2d');
    if (distributionCtx) {
        window.distributionChart = new Chart(distributionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Mined', 'Claimed', 'Withdrawn'],
                datasets: [{
                    data: [100, 50, 25],
                    backgroundColor: ['#f8c555', '#2ed573', '#ffa502']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%'
            }
        });
    }
}

// Update charts
function updateCharts() {
    if (window.miningChart) {
        window.miningChart.update();
    }
    if (window.distributionChart) {
        window.distributionChart.update();
    }
}

// Export
window.updateCharts = updateCharts;
