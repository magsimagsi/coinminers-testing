// Blockchain/Wallet Functions
let web3 = null;
let userAccount = null;
let connected = false;
let tokenContract = null;
let walletListeners = false;

// Contract Configuration
const TOKEN_CONFIG = {
    MTK: {
        address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC on Sepolia
        name: 'MTK Game Token',
        symbol: 'MTK',
        decimals: 6,
        etherscan: 'https://sepolia.etherscan.io/address/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
    }
};

// ERC20 ABI - ONLY VALID FUNCTIONS
const ERC20_ABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "success", "type": "bool"}],
        "type": "function"
    }
];

// Initialize Web3
async function initWeb3() {
    try {
        console.log('Initializing Web3...');
        
        if (typeof window.ethereum === 'undefined') {
            console.log('MetaMask not installed');
            return false;
        }

        const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
        });

        if (accounts.length > 0) {
            userAccount = accounts[0];
            web3 = new Web3(window.ethereum);
            connected = true;
            
            tokenContract = new web3.eth.Contract(ERC20_ABI, TOKEN_CONFIG.MTK.address);
            
            const chainId = await web3.eth.getChainId();
            const isSepolia = chainId === 11155111;
            
            updateUIAfterConnection(isSepolia);
            await updateBalances();
            setupWalletListeners();
            
            console.log('Auto-connected to wallet');
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('initWeb3 error:', error);
        return false;
    }
}

// Connect Wallet
async function connectWallet() {
    try {
        console.log('Connecting wallet...');
        
        if (typeof window.ethereum === 'undefined') {
            showNotification('Please install MetaMask!', 'error');
            return;
        }

        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (accounts.length === 0) {
            showNotification('Please unlock MetaMask!', 'error');
            return;
        }
        
        userAccount = accounts[0];
        web3 = new Web3(window.ethereum);
        connected = true;
        
        const chainId = await web3.eth.getChainId();
        const isSepolia = chainId === 11155111;
        
        tokenContract = new web3.eth.Contract(ERC20_ABI, TOKEN_CONFIG.MTK.address);
        
        updateUIAfterConnection(isSepolia);
        await updateBalances();
        
        showNotification(`Connected: ${formatAddress(userAccount)}`, 'success');
        
        if (!isSepolia) {
            showNotification('Switch to Sepolia for tokens', 'warning');
        }
        
        setupWalletListeners();
        
    } catch (error) {
        console.error('Connection error:', error);
        
        if (error.code === 4001) {
            showNotification('Connection rejected', 'error');
        } else {
            showNotification('Connection failed: ' + error.message, 'error');
        }
    }
}

// Update UI after connection
function updateUIAfterConnection(isSepolia) {
    updateElement('walletStatus', 'Connected ✓');
    updateElement('accountAddress', formatAddress(userAccount));
    updateElement('network', isSepolia ? 'Sepolia ✓' : 'Wrong Network');
    
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.innerHTML = '<i class="fas fa-wallet"></i> Disconnect';
        connectBtn.onclick = disconnectWallet;
    }
    
    const walletStatus = document.querySelector('.wallet-status');
    if (walletStatus) {
        walletStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>Connected</span>';
        walletStatus.classList.add('connected');
    }
}

// Setup wallet listeners
function setupWalletListeners() {
    if (!walletListeners && window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        walletListeners = true;
    }
}

// Handle Account Changes
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else if (accounts[0] !== userAccount) {
        userAccount = accounts[0];
        updateElement('accountAddress', formatAddress(userAccount));
        showNotification('Account changed', 'info');
        updateBalances();
    }
}

// Handle Chain Changes
function handleChainChanged() {
    window.location.reload();
}

// Disconnect Wallet
function disconnectWallet() {
    connected = false;
    web3 = null;
    userAccount = null;
    tokenContract = null;
    
    updateElement('walletStatus', 'Not Connected');
    updateElement('accountAddress', 'Not connected');
    updateElement('network', '-');
    updateElement('ethBalance', '0 ETH');
    updateElement('walletTokenBalance', '0 MTK');
    
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect Wallet';
        connectBtn.onclick = connectWallet;
    }
    
    const walletStatus = document.querySelector('.wallet-status');
    if (walletStatus) {
        walletStatus.innerHTML = '<i class="fas fa-plug"></i><span>Not Connected</span>';
        walletStatus.classList.remove('connected');
    }
    
    showNotification('Wallet disconnected', 'info');
}

// Update Balances
async function updateBalances() {
    if (!connected || !web3) return;
    
    try {
        const ethBalance = await web3.eth.getBalance(userAccount);
        const ethFormatted = web3.utils.fromWei(ethBalance, 'ether');
        updateElement('ethBalance', `${parseFloat(ethFormatted).toFixed(4)} ETH`);
        
        if (tokenContract) {
            try {
                const tokenBalance = await tokenContract.methods.balanceOf(userAccount).call();
                const decimals = 6; // USDC has 6 decimals
                const tokenFormatted = tokenBalance / Math.pow(10, decimals);
                
                window.walletTokenBalance = tokenFormatted;
                updateElement('walletTokenBalance', tokenFormatted.toFixed(4));
                updateElement('statsWalletBalance', `${tokenFormatted.toFixed(4)} MTK`);
            } catch (error) {
                console.log('Token balance error (maybe no tokens):', error);
            }
        }
        
        const blockNumber = await web3.eth.getBlockNumber();
        updateElement('lastBlock', blockNumber);
        
    } catch (error) {
        console.error('Balance update error:', error);
    }
}

// Get MTK Tokens - Shows instructions
async function getMTKFromFaucet() {
    if (!connected) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    showNotification('Opening token instructions...', 'info');
    
    setTimeout(() => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 4000;
        `;
        
        modal.innerHTML = `
            <div style="background: #1e293b; border-radius: 12px; padding: 20px; max-width: 500px; width: 90%; border: 2px solid #f8c555;">
                <h3 style="color: #f8c555; margin-bottom: 15px;">
                    <i class="fas fa-info-circle"></i> Get MTK Tokens
                </h3>
                <div style="color: #94a3b8; margin-bottom: 20px;">
                    <p>To get MTK tokens (USDC on Sepolia):</p>
                    <p>1. Get Sepolia ETH from faucet</p>
                    <p>2. Go to Uniswap on Sepolia network</p>
                    <p>3. Swap ETH for USDC</p>
                    <p><strong>Token Address:</strong></p>
                    <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 6px; font-family: monospace; font-size: 12px; word-break: break-all; margin: 10px 0;">
                        0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.open('https://sepoliafaucet.com', '_blank')" 
                            style="flex: 1; background: #667eea; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer;">
                        Get ETH
                    </button>
                    <button onclick="window.open('https://app.uniswap.org', '_blank')" 
                            style="flex: 1; background: #f8c555; color: black; border: none; padding: 10px; border-radius: 6px; cursor: pointer;">
                        Uniswap
                    </button>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: #64748b; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.onclick = function(e) {
            if (e.target === modal) modal.remove();
        };
    }, 100);
}

// Mint Game Tokens - Simulated
async function mintGameTokens(amount) {
    if (!connected) {
        showNotification('Connect wallet first!', 'error');
        return false;
    }
    
    showPendingOverlay(`Processing ${amount} MTK...`);
    
    setTimeout(() => {
        hidePendingOverlay();
        
        const getTokens = confirm(
            `🎮 ${amount} MTK would be minted\n\n` +
            `For real USDC tokens:\n` +
            `1. Get Sepolia ETH\n` +
            `2. Swap for USDC on Uniswap\n\n` +
            `Open instructions?`
        );
        
        if (getTokens) {
            getMTKFromFaucet();
        } else {
            if (window.walletTokenBalance === undefined) {
                window.walletTokenBalance = 0;
            }
            window.walletTokenBalance += amount;
            updateElement('walletTokenBalance', window.walletTokenBalance.toFixed(4));
            showNotification(`${amount} MTK added to game`, 'success');
        }
    }, 1500);
    
    return true;
}

// Check MTK Balance
async function checkMTKBalance() {
    if (!connected) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    if (tokenContract) {
        try {
            const balance = await tokenContract.methods.balanceOf(userAccount).call();
            const formatted = balance / Math.pow(10, 6);
            showNotification(`Balance: ${formatted.toFixed(4)} MTK`, 'success');
        } catch (error) {
            showNotification('No tokens found', 'info');
        }
    } else {
        const balance = window.walletTokenBalance || 0;
        showNotification(`Game Balance: ${balance.toFixed(4)} MTK`, 'success');
    }
}

// Withdraw Tokens
async function withdrawTokens() {
    if (!connected || !tokenContract) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    const amountInput = document.getElementById('withdrawAmount');
    const recipientInput = document.getElementById('recipientAddress');
    
    const amount = parseFloat(amountInput?.value);
    let recipient = recipientInput?.value?.trim();
    
    if (!recipient) {
        recipient = userAccount;
        recipientInput.value = userAccount;
    }
    
    if (!amount || amount <= 0) {
        showNotification('Enter valid amount', 'error');
        return;
    }
    
    if (!recipient || !web3.utils.isAddress(recipient)) {
        showNotification('Invalid address', 'error');
        return;
    }
    
    const walletBalance = window.walletTokenBalance || 0;
    if (walletBalance < amount) {
        showNotification(`Insufficient balance! You have ${walletBalance.toFixed(4)} MTK`, 'error');
        return;
    }
    
    try {
        showPendingOverlay('Processing...');
        
        const amountInWei = (amount * Math.pow(10, 6)).toString();
        
        const tx = await tokenContract.methods.transfer(
            recipient, 
            amountInWei
        ).send({ 
            from: userAccount,
            gas: 100000
        });
        
        hidePendingOverlay();
        showNotification(`✅ Sent ${amount} MTK!`, 'success');
        
        window.walletTokenBalance -= amount;
        updateElement('walletTokenBalance', window.walletTokenBalance.toFixed(4));
        
        if (amountInput) amountInput.value = '';
        
        addTransactionToHistory(tx.transactionHash, amount, recipient, 'success');
        
        setTimeout(() => updateBalances(), 2000);
        
    } catch (error) {
        hidePendingOverlay();
        console.error('Withdrawal error:', error);
        
        if (error.code === 4001) {
            showNotification('Transaction rejected', 'error');
        } else if (error.message.includes('insufficient funds')) {
            showNotification('Need ETH for gas', 'error');
        } else {
            showNotification('Transfer failed: ' + error.message, 'error');
        }
    }
}

// Add Transaction to History
function addTransactionToHistory(txHash, amount, recipient, status) {
    const transactionsList = document.getElementById('transactionsList');
    if (!transactionsList) return;
    
    const emptyItem = transactionsList.querySelector('.transaction-item.empty');
    if (emptyItem) emptyItem.remove();
    
    const transactionItem = document.createElement('div');
    transactionItem.className = `transaction-item ${status}`;
    
    const time = new Date().toLocaleTimeString();
    const shortHash = txHash.substring(0, 10) + '...' + txHash.substring(62);
    const shortRecipient = recipient.substring(0, 6) + '...' + recipient.substring(38);
    
    transactionItem.innerHTML = `
        <i class="fas fa-exchange-alt"></i>
        <div class="transaction-details">
            <div class="transaction-amount">${amount} MTK</div>
            <div class="transaction-to">To: ${shortRecipient}</div>
            <div class="transaction-hash">${shortHash}</div>
        </div>
        <div class="transaction-time">${time}</div>
    `;
    
    transactionsList.insertBefore(transactionItem, transactionsList.firstChild);
    
    const items = transactionsList.querySelectorAll('.transaction-item:not(.empty)');
    if (items.length > 10) {
        transactionsList.removeChild(items[items.length - 1]);
    }
}

// Switch Network to Sepolia
async function switchToSepolia() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
        });
        showNotification('Switched to Sepolia!', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Switch error:', error);
        showNotification('Failed to switch network', 'error');
    }
}

// Add MTK to MetaMask
async function addMTKToMetaMask() {
    if (!window.ethereum) {
        showNotification('MetaMask not installed', 'error');
        return;
    }
    
    if (!connected) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    try {
        await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: TOKEN_CONFIG.MTK.address,
                    symbol: 'MTK',
                    decimals: 6
                },
            },
        });
        showNotification('MTK added to MetaMask!', 'success');
    } catch (error) {
        console.error('Add token error:', error);
        showNotification('Failed to add token', 'error');
    }
}

// Format address helper
function formatAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Export functions
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.getMTKFromFaucet = getMTKFromFaucet;
window.mintGameTokens = mintGameTokens;
window.checkMTKBalance = checkMTKBalance;
window.withdrawTokens = withdrawTokens;
window.switchToSepolia = switchToSepolia;
window.addMTKToMetaMask = addMTKToMetaMask;
window.initWeb3 = initWeb3;
window.formatAddress = formatAddress;

// Auto-initialize
setTimeout(async () => {
    await initWeb3();
}, 100);
