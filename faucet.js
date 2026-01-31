// Faucet Functions

// Get MTK Tokens
function getMTKTokens() {
    console.log('getMTKTokens() called');
    
    if (!window.connected) {
        const connectFirst = confirm('Connect wallet to get MTK tokens! Connect now?');
        if (connectFirst && typeof connectWallet === 'function') {
            connectWallet().then(() => {
                if (window.connected && typeof getMTKFromFaucet === 'function') {
                    setTimeout(() => getMTKFromFaucet(), 1000);
                }
            });
        }
        return;
    }
    
    // Check network
    if (window.web3) {
        window.web3.eth.getChainId().then(chainId => {
            if (chainId !== 11155111) {
                const switchConfirm = confirm('Switch to Sepolia network for MTK tokens?');
                if (switchConfirm && typeof switchToSepolia === 'function') {
                    switchToSepolia().then(() => {
                        setTimeout(() => {
                            if (typeof getMTKFromFaucet === 'function') {
                                getMTKFromFaucet();
                            }
                        }, 2000);
                    });
                }
            } else {
                if (typeof getMTKFromFaucet === 'function') {
                    getMTKFromFaucet();
                }
            }
        });
    }
}

// Get UNI Tokens
function getUniTokens() {
    if (!window.connected) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    createTokenInstructions('UNI', '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', '#ff007a');
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
    
    createTokenInstructions('DAI', '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6', '#f6851b');
}

// Create Token Instructions Modal
function createTokenInstructions(tokenName, contractAddress, color) {
    const modal = document.createElement('div');
    modal.style.cssText = `
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
        backdrop-filter: blur(10px);
    `;
    
    modal.innerHTML = `
        <div style="background: #1e293b; border-radius: 16px; padding: 30px; max-width: 500px; width: 90%; border: 2px solid ${color};">
            <h3 style="color: ${color}; margin-bottom: 20px;">
                <i class="fas fa-coins"></i> Get ${tokenName} Tokens
            </h3>
            <div style="color: #94a3b8; margin-bottom: 20px;">
                <p><strong>Step 1:</strong> Get Sepolia ETH from a faucet</p>
                <p><strong>Step 2:</strong> Go to Uniswap on Sepolia network</p>
                <p><strong>Step 3:</strong> Swap ETH for ${tokenName} tokens</p>
                <p><strong>${tokenName} Address:</strong> 
                    <code style="background: rgba(255,255,255,0.1); padding: 5px; border-radius: 4px; display: block; margin-top: 5px; word-break: break-all;">
                        ${contractAddress}
                    </code>
                </p>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="window.open('https://sepoliafaucet.com', '_blank')" 
                        style="background: #667eea; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; flex: 1; min-width: 120px;">
                    Get ETH
                </button>
                <button onclick="window.open('https://app.uniswap.org/swap', '_blank')" 
                        style="background: ${color}; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; flex: 1; min-width: 120px;">
                    Uniswap
                </button>
                <button onclick="copyToClipboard('${contractAddress}')" 
                        style="background: rgba(255,255,255,0.1); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; flex: 1; min-width: 120px;">
                    Copy Address
                </button>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: #64748b; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Copy to Clipboard Helper
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Address copied to clipboard!', 'success');
    } catch (err) {
        console.error('Failed to copy:', err);
        showNotification('Failed to copy address', 'error');
    }
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
window.copyToClipboard = copyToClipboard;
