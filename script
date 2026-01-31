// Main Application Script
document.addEventListener('DOMContentLoaded', function() {
    // Navigation handling
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const targetId = this.getAttribute('href').substring(1);
            document.getElementById(targetId).classList.add('active');
            
            // Scroll to top of section
            document.querySelector('.main-container').scrollTop = 0;
        });
    });
    
    // Initialize game if not already initialized
    if (typeof initGame === 'function') {
        setTimeout(() => {
            if (!window.gameInitialized) {
                initGame();
                window.gameInitialized = true;
            }
        }, 100);
    }
    
    // Check for existing wallet connection
    checkExistingConnection();
    
    // Initialize charts if Chart.js is loaded
    if (typeof Chart !== 'undefined') {
        initCharts();
    }
});

// Check existing wallet connection
async function checkExistingConnection() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0 && typeof connectWallet === 'function') {
                // Auto-connect if previously connected
                setTimeout(() => connectWallet(), 1000);
            }
        } catch (error) {
            console.log('No existing connection found');
        }
    }
}

// Initialize charts
function initCharts() {
    // Mining progress chart
    const miningCtx = document.getElementById('miningChart')?.getContext('2d');
    if (miningCtx) {
        window.miningChart = new Chart(miningCtx, {
            type: 'line',
            data: {
                labels: Array.from({length: 10}, (_, i) => `Day ${i + 1}`),
                datasets: [{
                    label: 'MTK Mined',
                    data: Array.from({length: 10}, () => Math.floor(Math.random() * 1000)),
                    borderColor: '#f8c555',
                    backgroundColor: 'rgba(248, 197, 85, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }
    
    // Token distribution chart
    const distributionCtx = document.getElementById('distributionChart')?.getContext('2d');
    if (distributionCtx) {
        window.distributionChart = new Chart(distributionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Mined', 'Claimed', 'Withdrawn'],
                datasets: [{
                    data: [100, 50, 25],
                    backgroundColor: [
                        '#f8c555',
                        '#2ed573',
                        '#ffa502'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94a3b8',
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
}

// Update charts with real data
function updateCharts() {
    if (window.miningChart) {
        // Update with real mining data
        const newData = window.miningChart.data.datasets[0].data;
        newData.push(Math.floor(Math.random() * 1000));
        if (newData.length > 10) newData.shift();
        window.miningChart.update();
    }
    
    if (window.distributionChart) {
        // Update with real distribution data
        const totalMined = window.totalMined || 0;
        const totalClaimed = window.totalClaimed || 0;
        const totalWithdrawn = window.totalWithdrawn || 0;
        
        window.distributionChart.data.datasets[0].data = [
            totalMined,
            totalClaimed,
            totalWithdrawn
        ];
        window.distributionChart.update();
    }
}

// Export functions for other modules
window.showNotification = showNotification;
window.showPendingOverlay = showPendingOverlay;
window.hidePendingOverlay = hidePendingOverlay;
window.updateCharts = updateCharts;
