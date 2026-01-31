// Faucet Functions

// Get UNI Tokens
function getUniTokens() {
    if (!window.connected) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    const message = `
        🎁 To get UNI tokens:
        1. First get Sepolia ETH from a faucet
        2. Go to Uniswap: https://app.uniswap.org
        3. Connect your wallet (make sure it's on Sepolia)
        4. Swap 0.01 ETH for UNI tokens
        5. Use the tokens to test withdrawals!
    `;
    
    showNotification('Opening instructions...', 'info');
    
    // Create instructions modal
    const modal = document.createElement('div');
    modal.className = 'faucet-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3><i class="fas fa-gift"></i> Get UNI Tokens</h3>
            <div class="modal-body">
                <p>${message.replace(/\n/g, '<br>')}</p>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="window.open('https://sepoliafaucet.com', '_blank')">
                        <i class="fas fa-faucet"></i> Get ETH First
                    </button>
                    <button class="btn btn-success" onclick="window.open('https://app.uniswap.org/swap', '_blank')">
                        <i class="fas fa-exchange-alt"></i> Go to Uniswap
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.faucet-modal').remove()">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles for modal
    const style = document.createElement('style');
    style.textContent = `
        .faucet-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 4000;
            animation: fadeIn 0.3s ease;
        }
        
        .faucet-modal .modal-content {
            background: var(--bg-card);
            border-radius: var(--border-radius-lg);
            padding: var(--spacing-2xl);
            max-width: 500px;
            width: 90%;
            border: 1px solid var(--primary);
            animation: scaleIn 0.3s ease;
        }
        
        .faucet-modal h3 {
            color: var(--primary);
            margin-bottom: var(--spacing-lg);
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }
        
        .faucet-modal .modal-body {
            color: var(--text-secondary);
            line-height: 1.6;
        }
        
        .faucet-modal .modal-actions {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-md);
            margin-top: var(--spacing-xl);
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
}

// Get LINK Tokens
function getLinkTokens() {
    if (!window.connected) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    showNotification('Opening Chainlink faucet...', 'info');
    window.open('https://faucets.chain.link/sepolia', '_blank');
}

// Get DAI Tokens
function getDaiTokens() {
    if (!window.connected) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    showNotification('To get DAI: Swap ETH for DAI on Uniswap', 'info');
    window.open('https://app.uniswap.org/swap', '_blank');
}

// Copy Address to Clipboard
function copyAddress() {
    if (!window.userAccount) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    navigator.clipboard.writeText(window.userAccount)
        .then(() => {
            showNotification('Address copied to clipboard!', 'success');
        })
        .catch(err => {
            showNotification('Failed to copy address', 'error');
        });
}

// Get Test ETH from Faucet
function getTestETH(faucetType) {
    const faucets = {
        alchemy: 'https://sepoliafaucet.com',
        infura: 'https://www.infura.io/faucet/sepolia',
        quicknode: 'https://faucet.quicknode.com/ethereum/sepolia'
    };
    
    const url = faucets[faucetType];
    if (url) {
        showNotification(`Opening ${faucetType} faucet...`, 'info');
        window.open(url, '_blank');
    }
}

// Export functions
window.getUniTokens = getUniTokens;
window.getLinkTokens = getLinkTokens;
window.getDaiTokens = getDaiTokens;
window.copyAddress = copyAddress;
window.getTestETH = getTestETH;