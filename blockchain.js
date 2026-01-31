// Blockchain/Wallet Functions with Real-time Event Listeners
let web3 = null;
let userAccount = null;
let connected = false;
let tokenContract = null;
let currentToken = 'UNI';
let pendingTransactions = new Map();
let transactionListeners = {};

// Contract Configuration
const TOKEN_CONFIG = {
    UNI: {
        address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        name: 'Uniswap',
        symbol: 'UNI',
        decimals: 18
    },
    LINK: {
        address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        name: 'Chainlink',
        symbol: 'LINK',
        decimals: 18
    },
    DAI: {
        address: '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6',
        name: 'DAI Stablecoin',
        symbol: 'DAI',
        decimals: 18
    }
};

// ERC20 ABI
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
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "name": "from", "type": "address"},
            {"indexed": true, "name": "to", "type": "address"},
            {"indexed": false, "name": "value", "type": "uint256"}
        ],
        "name": "Transfer",
        "type": "event"
    }
];

// Connect Wallet with Popup
async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            showNotification('Please install MetaMask!', 'error');
            showWalletPopup('install');
            return;
        }

        showWalletPopup('connecting');
        
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (accounts.length === 0) {
            showNotification('Please unlock MetaMask!', 'error');
            showWalletPopup('unlock');
            return;
        }
        
        userAccount = accounts[0];
        web3 = new Web3(window.ethereum);
        
        // Check network
        const chainId = await web3.eth.getChainId();
        const isSepolia = chainId === 11155111;
        
        // Update UI
        updateElement('walletStatus', 'Connected ✓');
        updateElement('accountAddress', 
            formatAddress(userAccount));
        updateElement('network', 
            isSepolia ? 'Sepolia Testnet ✓' : `Network ${chainId}`);
        
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.textContent = '✅ Connected';
            connectBtn.disabled = true;
        }
        
        // Update wallet status display
        const walletStatus = document.querySelector('.wallet-status');
        if (walletStatus) {
            walletStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>Connected</span>';
            walletStatus.classList.add('connected');
        }
        
        connected = true;
        
        // Initialize token contract (UNI by default)
        tokenContract = new web3.eth.Contract(ERC20_ABI, TOKEN_CONFIG.UNI.address);
        
        // Setup event listeners
        setupEventListeners();
        
        // Get balances
        await updateBalances();
        
        // Setup disconnect button
        setupDisconnectButton();
        
        showWalletPopup('connected');
        showNotification('Wallet connected successfully!', 'success');
        
        if (!isSepolia) {
            showNotification('Switch to Sepolia for test tokens', 'warning');
        }
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        
        // Start balance polling
        startBalancePolling();
        
    } catch (error) {
        console.error('Connection error:', error);
        showWalletPopup('error', error.message);
        
        if (error.code === 4001) {
            showNotification('Connection rejected by user', 'error');
        } else {
            showNotification('Connection failed: ' + error.message, 'error');
        }
    }
}

// Wallet Popup System
function showWalletPopup(type, message = '') {
    const popup = document.getElementById('walletPopup') || createWalletPopup();
    
    const popupContent = {
        install: {
            title: 'MetaMask Required',
            icon: 'fa-download',
            message: 'Please install MetaMask browser extension to connect your wallet.',
            actions: [{
                text: 'Install MetaMask',
                action: () => window.open('https://metamask.io/download', '_blank')
            }]
        },
        connecting: {
            title: 'Connecting...',
            icon: 'fa-spinner fa-spin',
            message: 'Please approve the connection in MetaMask.',
            actions: []
        },
        unlock: {
            title: 'Wallet Locked',
            icon: 'fa-lock',
            message: 'Please unlock your MetaMask wallet.',
            actions: []
        },
        connected: {
            title: 'Connected!',
            icon: 'fa-check-circle',
            message: 'Wallet connected successfully.',
            actions: [{
                text: 'View Account',
                action: () => window.open(`https://sepolia.etherscan.io/address/${userAccount}`, '_blank')
            }]
        },
        error: {
            title: 'Connection Failed',
            icon: 'fa-exclamation-circle',
            message: message || 'Failed to connect wallet.',
            actions: [{
                text: 'Try Again',
                action: connectWallet
            }]
        }
    };
    
    const content = popupContent[type];
    popup.innerHTML = `
        <div class="popup-content">
            <div class="popup-header">
                <i class="fas ${content.icon}"></i>
                <h3>${content.title}</h3>
                <button class="popup-close" onclick="hideWalletPopup()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="popup-body">
                <p>${content.message}</p>
                ${content.actions.length > 0 ? `
                    <div class="popup-actions">
                        ${content.actions.map(action => `
                            <button class="btn btn-primary" onclick="${action.action.name}()">
                                ${action.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    popup.classList.add('active');
    
    // Auto-hide success popups
    if (type === 'connected') {
        setTimeout(() => hideWalletPopup(), 3000);
    }
}

function createWalletPopup() {
    const popup = document.createElement('div');
    popup.id = 'walletPopup';
    popup.className = 'wallet-popup';
    document.body.appendChild(popup);
    return popup;
}

function hideWalletPopup() {
    const popup = document.getElementById('walletPopup');
    if (popup) {
        popup.classList.remove('active');
    }
}

// Setup Event Listeners for Real-time Updates
function setupEventListeners() {
    if (!web3 || !tokenContract) return;
    
    // Listen for new blocks
    web3.eth.subscribe('newBlockHeaders', (error, blockHeader) => {
        if (!error) {
            updateElement('lastBlock', blockHeader.number);
            updateBalances(); // Update balances on new block
        }
    });
    
    // Listen for Transfer events for current token
    const transferEvent = tokenContract.events.Transfer({
        filter: {from: userAccount},
        fromBlock: 'latest'
    });
    
    transferEvent.on('data', (event) => {
        console.log('Transfer event detected:', event);
        showNotification('Token transfer detected!', 'info');
        updateBalances();
    });
    
    transferEvent.on('error', console.error);
    
    // Store listener for cleanup
    transactionListeners.transfer = transferEvent;
}

// Start Balance Polling
function startBalancePolling() {
    if (window.balancePollInterval) {
        clearInterval(window.balancePollInterval);
    }
    
    window.balancePollInterval = setInterval(async () => {
        if (connected) {
            await updateBalances();
        }
    }, 10000); // Update every 10 seconds
}

// Enhanced Gas Estimation with Real-time Updates
async function estimateWithdrawGas() {
    if (!connected || !web3 || !tokenContract) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    const amountInput = document.getElementById('withdrawAmount');
    const recipientInput = document.getElementById('recipientAddress');
    
    const amount = parseFloat(amountInput?.value);
    const recipient = recipientInput?.value?.trim();
    
    // Validation
    if (!amount || amount <= 0) {
        showNotification('Enter valid amount', 'error');
        return;
    }
    
    if (!recipient || !web3.utils.isAddress(recipient)) {
        showNotification('Enter valid address', 'error');
        return;
    }
    
    const walletBalance = window.walletTokenBalance || 0;
    if (walletBalance < amount) {
        showNotification(`Insufficient balance! You have ${walletBalance.toFixed(4)} tokens`, 'error');
        return;
    }
    
    try {
        showPendingOverlay('Estimating gas...');
        
        // Get current gas price with real-time updates
        const gasPrice = await web3.eth.getGasPrice();
        const currentGasPrice = parseFloat(web3.utils.fromWei(gasPrice, 'gwei'));
        
        // Convert amount to wei
        const decimals = await tokenContract.methods.decimals().call();
        const amountInWei = amount * Math.pow(10, decimals);
        
        // Estimate gas
        const estimatedGas = await tokenContract.methods.transfer(
            recipient, 
            amountInWei.toString()
        ).estimateGas({ from: userAccount });
        
        // Calculate gas cost in ETH and USD (approximate)
        const gasCostEth = estimatedGas * gasPrice / Math.pow(10, 18);
        const ethPrice = await getEthPrice(); // Optional: Fetch real ETH price
        
        // Update gas info display with real-time data
        const gasInfo = document.getElementById('withdrawGasInfo');
        if (gasInfo) {
            gasInfo.innerHTML = `
                <i class="fas fa-gas-pump"></i>
                <div class="gas-details">
                    <strong>Gas Estimate - Live</strong>
                    <div class="gas-metrics">
                        <div class="gas-metric">
                            <span class="metric-label">Gas Units:</span>
                            <span class="metric-value" id="gasUnits">${estimatedGas.toLocaleString()}</span>
                        </div>
                        <div class="gas-metric">
                            <span class="metric-label">Gas Price:</span>
                            <span class="metric-value" id="gasPrice">${currentGasPrice.toFixed(2)} Gwei</span>
                        </div>
                        <div class="gas-metric">
                            <span class="metric-label">Network Fee:</span>
                            <span class="metric-value" id="gasCost">~${gasCostEth.toFixed(6)} ETH</span>
                        </div>
                        ${ethPrice ? `
                        <div class="gas-metric">
                            <span class="metric-label">Approx. Cost:</span>
                            <span class="metric-value">~$${(gasCostEth * ethPrice).toFixed(2)} USD</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="gas-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <small>Gas prices update in real-time. Actual cost may vary.</small>
                    </div>
                </div>
            `;
        }
        
        // Enable withdraw button
        const withdrawBtn = document.querySelector('.btn-withdraw');
        if (withdrawBtn) {
            withdrawBtn.disabled = false;
            withdrawBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Withdraw ${amount} Tokens`;
            withdrawBtn.dataset.estimatedGas = estimatedGas;
            withdrawBtn.dataset.gasPrice = gasPrice;
        }
        
        // Start gas price polling
        startGasPricePolling();
        
        hidePendingOverlay();
        showNotification('Gas estimation complete! Ready to withdraw.', 'success');
        
    } catch (error) {
        hidePendingOverlay();
        console.error('Gas estimation error:', error);
        
        if (error.message.includes('insufficient funds')) {
            showNotification('Insufficient ETH for gas fees', 'error');
            showWalletPopup('insufficientGas');
        } else if (error.message.includes('execution reverted')) {
            showNotification('Transaction would fail. Check token balance and approvals.', 'error');
        } else {
            showNotification('Gas estimation failed: ' + error.message, 'error');
        }
    }
}

// Real-time Gas Price Polling
function startGasPricePolling() {
    if (window.gasPollInterval) {
        clearInterval(window.gasPollInterval);
    }
    
    window.gasPollInterval = setInterval(async () => {
        if (!web3) return;
        
        try {
            const gasPrice = await web3.eth.getGasPrice();
            const currentGasPrice = parseFloat(web3.utils.fromWei(gasPrice, 'gwei'));
            
            // Update UI
            const gasPriceElement = document.getElementById('gasPrice');
            if (gasPriceElement) {
                gasPriceElement.textContent = `${currentGasPrice.toFixed(2)} Gwei`;
                
                // Color coding based on gas price
                if (currentGasPrice > 50) {
                    gasPriceElement.style.color = '#ff4757'; // Red - high
                } else if (currentGasPrice > 20) {
                    gasPriceElement.style.color = '#ffa502'; // Orange - medium
                } else {
                    gasPriceElement.style.color = '#2ed573'; // Green - low
                }
            }
            
            // Update total cost if gas units are available
            const gasUnitsElement = document.getElementById('gasUnits');
            const gasCostElement = document.getElementById('gasCost');
            
            if (gasUnitsElement && gasCostElement) {
                const estimatedGas = parseInt(gasUnitsElement.textContent.replace(/,/g, ''));
                const gasCostEth = estimatedGas * gasPrice / Math.pow(10, 18);
                gasCostElement.textContent = `~${gasCostEth.toFixed(6)} ETH`;
            }
            
        } catch (error) {
            console.error('Gas price polling error:', error);
        }
    }, 5000); // Update every 5 seconds
}

// Get ETH Price (optional)
async function getEthPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        return data.ethereum.usd;
    } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        return null;
    }
}

// Enhanced Withdraw Tokens with Real-time Status
async function withdrawTokens() {
    if (!connected || !web3 || !tokenContract) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    const amountInput = document.getElementById('withdrawAmount');
    const recipientInput = document.getElementById('recipientAddress');
    
    const amount = parseFloat(amountInput?.value);
    const recipient = recipientInput?.value?.trim();
    
    // Validation
    if (!amount || amount <= 0) {
        showNotification('Enter valid amount', 'error');
        return;
    }
    
    if (!recipient || !web3.utils.isAddress(recipient)) {
        showNotification('Enter valid address', 'error');
        return;
    }
    
    const walletBalance = window.walletTokenBalance || 0;
    if (walletBalance < amount) {
        showNotification(`Insufficient balance! You have ${walletBalance.toFixed(4)} tokens`, 'error');
        return;
    }
    
    try {
        showPendingOverlay('Preparing transaction...');
        
        // Get token info
        const decimals = await tokenContract.methods.decimals().call();
        const tokenSymbol = await tokenContract.methods.symbol().call();
        const amountInWei = amount * Math.pow(10, decimals);
        
        // Get gas settings from button data or estimate
        const withdrawBtn = document.querySelector('.btn-withdraw');
        const estimatedGas = withdrawBtn?.dataset.estimatedGas || 100000;
        const gasPrice = withdrawBtn?.dataset.gasPrice || await web3.eth.getGasPrice();
        
        // Show transaction details
        updatePendingOverlay('Confirm in MetaMask', {
            amount: amount,
            symbol: tokenSymbol,
            recipient: formatAddress(recipient),
            gas: estimatedGas,
            gasPrice: web3.utils.fromWei(gasPrice, 'gwei')
        });
        
        // Send transaction
        const tx = tokenContract.methods.transfer(recipient, amountInWei.toString());
        
        const txObject = {
            from: userAccount,
            gas: estimatedGas,
            gasPrice: gasPrice
        };
        
        // Send and get transaction hash immediately
        const txHash = await new Promise((resolve, reject) => {
            tx.send(txObject)
                .on('transactionHash', (hash) => {
                    resolve(hash);
                })
                .on('error', reject);
        });
        
        // Store pending transaction
        pendingTransactions.set(txHash, {
            amount: amount,
            symbol: tokenSymbol,
            recipient: recipient,
            status: 'pending',
            timestamp: Date.now()
        });
        
        // Update UI with transaction hash
        updatePendingOverlay('Transaction Submitted', {
            txHash: txHash,
            status: 'pending'
        });
        
        // Start tracking transaction
        trackTransaction(txHash, amount, recipient, tokenSymbol);
        
        // Clear form
        if (amountInput) amountInput.value = '';
        
        // Disable withdraw button
        if (withdrawBtn) {
            withdrawBtn.disabled = true;
            withdrawBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Withdraw Tokens`;
        }
        
    } catch (error) {
        hidePendingOverlay();
        console.error('Withdrawal error:', error);
        
        if (error.code === 4001 || error.message.includes('rejected')) {
            showNotification('Transaction rejected by user', 'error');
            updatePendingOverlay('Transaction Rejected', {status: 'rejected'});
        } else if (error.message.includes('gas')) {
            showNotification('Transaction failed: Gas estimation error', 'error');
        } else {
            showNotification('Withdrawal failed: ' + error.message, 'error');
        }
    }
}

// Track Transaction with Web3.js Event Listeners
async function trackTransaction(txHash, amount, recipient, symbol) {
    try {
        // Get transaction receipt
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        
        if (receipt) {
            // Transaction already mined
            processTransactionResult(txHash, receipt, amount, recipient, symbol);
        } else {
            // Wait for transaction to be mined
            const interval = setInterval(async () => {
                try {
                    const receipt = await web3.eth.getTransactionReceipt(txHash);
                    
                    if (receipt) {
                        clearInterval(interval);
                        processTransactionResult(txHash, receipt, amount, recipient, symbol);
                    }
                    
                    // Update pending time
                    const pendingTime = document.getElementById('pendingTime');
                    if (pendingTime) {
                        const elapsed = Math.floor((Date.now() - pendingTransactions.get(txHash)?.timestamp) / 1000);
                        pendingTime.textContent = `Pending for ${elapsed}s`;
                    }
                    
                } catch (error) {
                    console.error('Transaction tracking error:', error);
                    clearInterval(interval);
                }
            }, 2000); // Check every 2 seconds
            
            // Also listen for new blocks
            const blockSubscription = web3.eth.subscribe('newBlockHeaders', async (error, blockHeader) => {
                if (!error) {
                    const receipt = await web3.eth.getTransactionReceipt(txHash);
                    if (receipt) {
                        blockSubscription.unsubscribe();
                        clearInterval(interval);
                        processTransactionResult(txHash, receipt, amount, recipient, symbol);
                    }
                }
            });
            
            // Store for cleanup
            pendingTransactions.get(txHash).tracking = { interval, subscription: blockSubscription };
        }
        
    } catch (error) {
        console.error('Transaction tracking error:', error);
    }
}

// Process Transaction Result
function processTransactionResult(txHash, receipt, amount, recipient, symbol) {
    const txData = pendingTransactions.get(txHash);
    
    if (receipt.status) {
        // Success
        hidePendingOverlay();
        
        // Update wallet balance
        window.walletTokenBalance -= amount;
        window.totalWithdrawn = (window.totalWithdrawn || 0) + amount;
        
        // Update UI
        updateElement('walletTokenBalance', window.walletTokenBalance.toFixed(4));
        updateElement('totalWithdrawn', window.totalWithdrawn.toFixed(4));
        
        // Add to transaction history
        addTransactionToHistory(txHash, amount, recipient, 'success');
        
        // Show success notification
        showNotification(`✅ Successfully withdrew ${amount} ${symbol}!`, 'success');
        
        // Show success popup
        showTransactionPopup('success', {
            amount: amount,
            symbol: symbol,
            txHash: txHash,
            gasUsed: receipt.gasUsed,
            blockNumber: receipt.blockNumber
        });
        
        // Add activity
        if (typeof addActivity === 'function') {
            addActivity('Withdrawn', `${amount} ${symbol}`);
        }
        
        // Update charts
        if (typeof updateCharts === 'function') {
            updateCharts();
        }
        
    } else {
        // Failed
        hidePendingOverlay();
        showNotification('Transaction failed on-chain', 'error');
        addTransactionToHistory(txHash, amount, recipient, 'failed');
        
        // Show failure popup
        showTransactionPopup('failed', {
            amount: amount,
            symbol: symbol,
            txHash: txHash
        });
    }
    
    // Clean up
    pendingTransactions.delete(txHash);
    if (txData?.tracking) {
        clearInterval(txData.tracking.interval);
        txData.tracking.subscription.unsubscribe();
    }
    
    // Update balances
    updateBalances();
}

// Transaction Popup
function showTransactionPopup(type, data) {
    const popup = document.getElementById('transactionPopup') || createTransactionPopup();
    
    const popupContent = {
        success: {
            title: 'Transaction Successful!',
            icon: 'fa-check-circle',
            color: '#2ed573',
            message: `Successfully sent ${data.amount} ${data.symbol}`,
            details: `
                <div class="tx-detail">
                    <span>Transaction Hash:</span>
                    <code>${formatAddress(data.txHash, 10, 8)}</code>
                </div>
                <div class="tx-detail">
                    <span>Gas Used:</span>
                    <span>${data.gasUsed.toLocaleString()}</span>
                </div>
                <div class="tx-detail">
                    <span>Block:</span>
                    <span>${data.blockNumber.toLocaleString()}</span>
                </div>
            `,
            actions: [{
                text: 'View on Explorer',
                action: () => window.open(`https://sepolia.etherscan.io/tx/${data.txHash}`, '_blank')
            }]
        },
        failed: {
            title: 'Transaction Failed',
            icon: 'fa-times-circle',
            color: '#ff4757',
            message: `Failed to send ${data.amount} ${data.symbol}`,
            details: `
                <div class="tx-detail">
                    <span>Transaction Hash:</span>
                    <code>${formatAddress(data.txHash, 10, 8)}</code>
                </div>
            `,
            actions: [{
                text: 'View Details',
                action: () => window.open(`https://sepolia.etherscan.io/tx/${data.txHash}`, '_blank')
            }]
        }
    };
    
    const content = popupContent[type];
    popup.innerHTML = `
        <div class="popup-content">
            <div class="popup-header" style="border-left-color: ${content.color}">
                <i class="fas ${content.icon}" style="color: ${content.color}"></i>
                <h3>${content.title}</h3>
                <button class="popup-close" onclick="hideTransactionPopup()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="popup-body">
                <p>${content.message}</p>
                <div class="tx-details">
                    ${content.details}
                </div>
                <div class="popup-actions">
                    ${content.actions.map(action => `
                        <button class="btn btn-primary" onclick="${action.action.name}()">
                            ${action.text}
                        </button>
                    `).join('')}
                    <button class="btn btn-secondary" onclick="hideTransactionPopup()">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    popup.classList.add('active');
    
    // Auto-hide after 10 seconds
    setTimeout(() => hideTransactionPopup(), 10000);
}

function createTransactionPopup() {
    const popup = document.createElement('div');
    popup.id = 'transactionPopup';
    popup.className = 'transaction-popup';
    document.body.appendChild(popup);
    return popup;
}

function hideTransactionPopup() {
    const popup = document.getElementById('transactionPopup');
    if (popup) {
        popup.classList.remove('active');
    }
}

// Update Pending Overlay with Real-time Info
function updatePendingOverlay(message, data = {}) {
    const pendingText = document.getElementById('pendingText');
    const pendingTxHash = document.getElementById('pendingTxHash');
    const pendingDetails = document.getElementById('pendingDetails');
    
    if (pendingText) pendingText.textContent = message;
    
    if (data.txHash && pendingTxHash) {
        pendingTxHash.textContent = `Tx Hash: ${formatAddress(data.txHash, 20, 20)}`;
        pendingTxHash.innerHTML += `<br><small>Click to copy</small>`;
        pendingTxHash.style.cursor = 'pointer';
        pendingTxHash.onclick = () => copyToClipboard(data.txHash);
    }
    
    if (pendingDetails && data) {
        let detailsHTML = '';
        
        if (data.amount && data.symbol) {
            detailsHTML += `<div class="pending-detail">
                <i class="fas fa-coins"></i>
                <span>${data.amount} ${data.symbol}</span>
            </div>`;
        }
        
        if (data.recipient) {
            detailsHTML += `<div class="pending-detail">
                <i class="fas fa-user"></i>
                <span>To: ${data.recipient}</span>
            </div>`;
        }
        
        if (data.gas) {
            detailsHTML += `<div class="pending-detail">
                <i class="fas fa-gas-pump"></i>
                <span>Gas: ${data.gas} units @ ${data.gasPrice} Gwei</span>
            </div>`;
        }
        
        if (data.status) {
            detailsHTML += `<div class="pending-detail">
                <i class="fas fa-circle ${data.status}"></i>
                <span>Status: ${data.status}</span>
            </div>`;
        }
        
        pendingDetails.innerHTML = detailsHTML;
    }
    
    // Update spinner based on status
    const spinner = document.querySelector('.pending-spinner');
    if (spinner) {
        if (data.status === 'pending') {
            spinner.style.borderTopColor = '#ffa502'; // Orange for pending
        } else if (data.status === 'rejected') {
            spinner.style.borderTopColor = '#ff4757'; // Red for rejected
        } else {
            spinner.style.borderTopColor = '#f8c555'; // Yellow for processing
        }
    }
}

// Add Transaction to History with Real-time Updates
function addTransactionToHistory(txHash, amount, recipient, status) {
    const transactionsList = document.getElementById('transactionsList');
    if (!transactionsList) return;
    
    // Remove empty state if present
    const emptyItem = transactionsList.querySelector('.transaction-item.empty');
    if (emptyItem) {
        emptyItem.remove();
    }
    
    const transactionItem = document.createElement('div');
    transactionItem.className = `transaction-item ${status}`;
    transactionItem.id = `tx-${txHash.substring(0, 10)}`;
    
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const shortHash = txHash.substring(0, 10) + '...' + txHash.substring(txHash.length - 8);
    const shortRecipient = formatAddress(recipient);
    
    transactionItem.innerHTML = `
        <div class="transaction-status">
            <i class="fas fa-${status === 'success' ? 'check-circle' : 'times-circle'}"></i>
            <span class="status-label">${status}</span>
        </div>
        <div class="transaction-details">
            <div class="transaction-main">
                <div class="transaction-amount">${amount} tokens</div>
                <div class="transaction-to">To: ${shortRecipient}</div>
            </div>
            <div class="transaction-meta">
                <div class="transaction-hash">${shortHash}</div>
                <div class="transaction-time">${time}</div>
            </div>
        </div>
        <div class="transaction-actions">
            <button class="btn-icon" onclick="copyToClipboard('${txHash}')" title="Copy Tx Hash">
                <i class="fas fa-copy"></i>
            </button>
            <button class="btn-icon" onclick="viewOnExplorer('${txHash}')" title="View on Explorer">
                <i class="fas fa-external-link-alt"></i>
            </button>
        </div>
    `;
    
    // Add animation for new transactions
    transactionItem.style.animation = 'slideIn 0.3s ease';
    
    transactionsList.insertBefore(transactionItem, transactionsList.firstChild);
    
    // Update transaction count
    updateTransactionCount();
    
    // Limit to 15 transactions
    const items = transactionsList.querySelectorAll('.transaction-item:not(.empty)');
    if (items.length > 15) {
        transactionsList.removeChild(items[items.length - 1]);
    }
}

// View on Explorer
function viewOnExplorer(txHash) {
    window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank');
}

// Update Transaction Count
function updateTransactionCount() {
    const transactionsList = document.getElementById('transactionsList');
    if (!transactionsList) return;
    
    const count = transactionsList.querySelectorAll('.transaction-item:not(.empty)').length;
    const countElement = document.getElementById('transactionCount') || createTransactionCount();
    
    countElement.textContent = `${count} transactions`;
    countElement.title = `${count} total transactions`;
    
    // Update badge color based on count
    if (count > 10) {
        countElement.style.background = '#2ed573';
    } else if (count > 5) {
        countElement.style.background = '#ffa502';
    } else {
        countElement.style.background = '#667eea';
    }
}

function createTransactionCount() {
    const countElement = document.createElement('span');
    countElement.id = 'transactionCount';
    countElement.className = 'transaction-count';
    
    const header = document.querySelector('.transaction-card h3');
    if (header) {
        header.appendChild(countElement);
    }
    
    return countElement;
}

// Handle Account Changes
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else if (accounts[0] !== userAccount) {
        userAccount = accounts[0];
        updateElement('accountAddress', formatAddress(userAccount));
        showNotification('Account changed', 'info');
        showWalletPopup('accountChanged', `Switched to ${formatAddress(userAccount)}`);
        updateBalances();
    }
}

// Handle Chain Changes
function handleChainChanged(chainId) {
    showNotification('Network changed', 'info');
    setTimeout(() => window.location.reload(), 1000);
}

// Disconnect Wallet
function disconnectWallet() {
    connected = false;
    web3 = null;
    userAccount = null;
    tokenContract = null;
    currentToken = 'UNI';
    
    // Clear intervals
    if (window.balancePollInterval) {
        clearInterval(window.balancePollInterval);
    }
    if (window.gasPollInterval) {
        clearInterval(window.gasPollInterval);
    }
    
    // Unsubscribe from listeners
    if (transactionListeners.transfer) {
        transactionListeners.transfer.unsubscribe();
    }
    
    // Clear pending transactions
    pendingTransactions.forEach(tx => {
        if (tx.tracking) {
            clearInterval(tx.tracking.interval);
            tx.tracking.subscription.unsubscribe();
        }
    });
    pendingTransactions.clear();
    
    // Update UI
    updateElement('walletStatus', 'Not Connected');
    updateElement('accountAddress', 'Not connected');
    updateElement('network', '-');
    updateElement('ethBalance', '0 ETH');
    
    // Reset connect button
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.textContent = '🔗 Connect Wallet';
        connectBtn.disabled = false;
    }
    
    // Update wallet status
    const walletStatus = document.querySelector('.wallet-status');
    if (walletStatus) {
        walletStatus.innerHTML = '<i class="fas fa-plug"></i><span>Not Connected</span>';
        walletStatus.classList.remove('connected');
    }
    
    // Remove disconnect button
    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
        disconnectBtn.remove();
    }
    
    // Hide popups
    hideWalletPopup();
    hideTransactionPopup();
    
    showNotification('Wallet disconnected', 'info');
}

// Update All Balances with Real-time Updates
async function updateBalances() {
    if (!connected || !web3) return;
    
    try {
        // Get ETH balance
        const ethBalance = await web3.eth.getBalance(userAccount);
        const ethFormatted = web3.utils.fromWei(ethBalance, 'ether');
        updateElement('ethBalance', `${parseFloat(ethFormatted).toFixed(4)} ETH`);
        
        // Update ETH balance with animation
        const ethElement = document.getElementById('ethBalance');
        if (ethElement) {
            ethElement.classList.add('updating');
            setTimeout(() => ethElement.classList.remove('updating'), 500);
        }
        
        // Get token balance
        if (tokenContract) {
            const tokenBalance = await tokenContract.methods.balanceOf(userAccount).call();
            const decimals = await tokenContract.methods.decimals().call();
            const tokenFormatted = tokenBalance / Math.pow(10, decimals);
            
            // Update wallet token balance
            if (typeof window !== 'undefined') {
                window.walletTokenBalance = tokenFormatted;
                updateElement('walletTokenBalance', tokenFormatted.toFixed(4));
                
                // Animate balance update
                const balanceElement = document.getElementById('walletTokenBalance');
                if (balanceElement) {
                    balanceElement.classList.add('updating');
                    setTimeout(() => balanceElement.classList.remove('updating'), 500);
                }
            }
            
            // Update token info
            const tokenSymbol = await tokenContract.methods.symbol().call();
            const tokenName = await tokenContract.methods.name().call();
            updateElement('tokenInfo', `${tokenName} (${tokenSymbol})`);
        }
        
        // Get latest block
        const blockNumber = await web3.eth.getBlockNumber();
        updateElement('lastBlock', blockNumber.toLocaleString());
        
    } catch (error) {
        console.error('Balance update error:', error);
    }
}

// Export functions
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.estimateWithdrawGas = estimateWithdrawGas;
window.withdrawTokens = withdrawTokens;
window.refreshTransactions = refreshTransactions;
window.hideWalletPopup = hideWalletPopup;
window.hideTransactionPopup = hideTransactionPopup;
window.viewOnExplorer = viewOnExplorer;
