// Faucet Functions

// Get MTK Tokens
async function getMTKTokens() {
    console.log('Getting MTK tokens...');
    
    if (!window.connected) {
        const connectFirst = confirm('Connect wallet first! Connect now?');
        if (connectFirst) {
            await connectWallet();
            if (!window.connected) return;
        } else {
            return;
        }
    }
    
    if (typeof getMTKFromFaucet === 'function') {
        getMTKFromFaucet();
    }
}

// Get UNI Tokens
async function getUniTokens() {
    if (!window.connected) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    showNotification('Opening Uniswap...', 'info');
    window.open('https://app.uniswap.org', '_blank');
}

// Get LINK Tokens
async function getLinkTokens() {
    if (!window.connected) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    showNotification('Opening Chainlink faucet...', 'info');
    window.open('https://faucets.chain.link/sepolia', '_blank');
}

// Get DAI Tokens
async function getDaiTokens() {
    if (!window.connected) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    showNotification('Opening DAI instructions...', 'info');
    window.open('https://app.uniswap.org', '_blank');
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
window.getMTKTokens = getMTKTokens;
window.getTestETH = getTestETH;
