// Blockchain/Wallet Functions
let web3 = null;
let userAccount = null;
let connected = false;
let tokenContract = null;
let currentToken = 'UNI';

// Contract Configuration - Enhanced with more contracts
const TOKEN_CONFIG = {
    UNI: {
        address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        name: 'Uniswap',
        symbol: 'UNI',
        decimals: 18,
        explorer: 'https://etherscan.io/token/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        faucet: 'https://app.uniswap.org/swap'
    },
    LINK: {
        address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        name: 'Chainlink',
        symbol: 'LINK',
        decimals: 18,
        explorer: 'https://etherscan.io/token/0x779877A7B0D9E8603169DdbD7836e478b4624789',
        faucet: 'https://faucets.chain.link/sepolia'
    },
    DAI: {
        address: '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6',
        name: 'DAI Stablecoin',
        symbol: 'DAI',
        decimals: 18,
        explorer: 'https://etherscan.io/token/0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6',
        faucet: 'https://app.uniswap.org/swap'
    },
    USDC: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        explorer: 'https://etherscan.io/token/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        faucet: 'https://app.uniswap.org/swap'
    },
    AAVE: {
        address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
        name: 'Aave',
        symbol: 'AAVE',
        decimals: 18,
        explorer: 'https://etherscan.io/token/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
        faucet: 'https://app.uniswap.org/swap'
    }
};

// ERC20 ABI - Enhanced
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
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    }
];

// Connect Wallet
async function connectWallet() {
    try {
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
        
        // Check network
        const chainId = await web3.eth.getChainId();
        const isSepolia = chainId === 11155111;
        const isMainnet = chainId === 1;
        
        // Update UI
        updateElement('walletStatus', 'Connected ✓');
        updateElement('accountAddress', 
            formatAddress(userAccount));
        updateElement('network', 
            isSepolia ? 'Sepolia Testnet ✓' : 
            isMainnet ? 'Ethereum Mainnet ✓' : 
            `Network ${chainId}`);
        
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
        
        // Get balances
        await updateBalances();
        
        // Setup token selector
        setupTokenSelector();
        
        // Setup disconnect button
        setupDisconnectButton();
        
        showNotification('Wallet connected successfully!', 'success');
        
        if (!isSepolia && !isMainnet) {
            showNotification('Switch to Sepolia or Mainnet for best experience', 'warning');
        }
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        
    } catch (error) {
        console.error('Connection error:', error);
        
        if (error.code === 4001) {
            showNotification('Connection rejected by user', 'error');
        } else {
            showNotification('Connection failed: ' + error.message, 'error');
        }
    }
}

// Setup Token Selector
function setupTokenSelector() {
    const tokenSelector = document.getElementById('tokenSelector');
    if (!tokenSelector) return;
    
    // Clear existing options
    tokenSelector.innerHTML = '';
    
    // Add options for each token
    Object.keys(TOKEN_CONFIG).forEach(tokenKey => {
        const token = TOKEN_CONFIG[tokenKey];
        const option = document.createElement('option');
        option.value = tokenKey;
        option.textContent = `${token.symbol} - ${token.name}`;
        option.selected = tokenKey === currentToken;
        tokenSelector.appendChild(option);
    });
    
    // Add change listener
    tokenSelector.onchange = async function() {
        currentToken = this.value;
        const token = TOKEN_CONFIG[currentToken];
        tokenContract = new web3.eth.Contract(ERC20_ABI, token.address);
        await updateBalances();
        showNotification(`Switched to ${token.symbol} token`, 'info');
    };
}

// Setup Disconnect Button
function setupDisconnectButton() {
    // Remove existing disconnect button if any
    const existingBtn = document.getElementById('disconnectBtn');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    // Create disconnect button
    const disconnectBtn = document.createElement('button');
    disconnectBtn.id = 'disconnectBtn';
    disconnectBtn.className = 'btn btn-disconnect';
    disconnectBtn.innerHTML = '<i class="fas fa-plug"></i> Disconnect';
    disconnectBtn.onclick = disconnectWallet;
    
    // Add it to the wallet status area
    const navWallet = document.querySelector('.nav-wallet');
    if (navWallet) {
        navWallet.appendChild(disconnectBtn);
    }
}

// Handle Account Changes
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User disconnected wallet
        disconnectWallet();
    } else if (accounts[0] !== userAccount) {
        // User switched accounts
        userAccount = accounts[0];
        updateElement('accountAddress', formatAddress(userAccount));
        showNotification('Account changed', 'info');
        updateBalances();
    }
}

// Handle Chain Changes
function handleChainChanged(chainId) {
    window.location.reload();
}

// Disconnect Wallet
function disconnectWallet() {
    connected = false;
    web3 = null;
    userAccount = null;
    tokenContract = null;
    currentToken = 'UNI';
    
    // Update UI elements
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
    
    // Update wallet status display
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
    
    // Remove token selector
    const tokenSelector = document.getElementById('tokenSelector');
    if (tokenSelector) {
        tokenSelector.remove();
    }
    
    showNotification('Wallet disconnected', 'info');
}

// Update All Balances
async function updateBalances() {
    if (!connected || !web3) return;
    
    try {
        // Get ETH balance
        const ethBalance = await web3.eth.getBalance(userAccount);
        const ethFormatted = web3.utils.fromWei(ethBalance, 'ether');
        updateElement('ethBalance', `${parseFloat(ethFormatted).toFixed(4)} ETH`);
        
        // Get token balance
        if (tokenContract) {
            const tokenBalance = await tokenContract.methods.balanceOf(userAccount).call();
            const decimals = await tokenContract.methods.decimals().call();
            const tokenFormatted = tokenBalance / Math.pow(10, decimals);
            
            // Update wallet token balance in game
            if (typeof window !== 'undefined' && window.walletTokenBalance !== undefined) {
                window.walletTokenBalance = tokenFormatted;
                updateElement('walletTokenBalance', tokenFormatted.toFixed(4));
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
        showNotification('Failed to update balances', 'error');
    }
}

// Estimate Withdrawal Gas
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
        
        // Convert amount to wei
        const decimals = await tokenContract.methods.decimals().call();
        const amountInWei = amount * Math.pow(10, decimals);
        
        // Estimate gas
        const estimatedGas = await tokenContract.methods.transfer(
            recipient, 
            amountInWei.toString()
        ).estimateGas({ from: userAccount });
        
        // Get gas price
        const gasPrice = await web3.eth.getGasPrice();
        const gasCost = estimatedGas * gasPrice / Math.pow(10, 18);
        
        // Update gas info display
        const gasInfo = document.getElementById('withdrawGasInfo');
        if (gasInfo) {
            gasInfo.innerHTML = `
                <i class="fas fa-gas-pump"></i>
                <div>
                    <strong>Gas Estimate</strong><br>
                    Units: ${estimatedGas.toLocaleString()}<br>
                    Price: ${parseFloat(web3.utils.fromWei(gasPrice, 'gwei')).toFixed(2)} Gwei<br>
                    Cost: ~${gasCost.toFixed(6)} ETH
                </div>
            `;
        }
        
        // Enable withdraw button
        const withdrawBtn = document.querySelector('.btn-withdraw');
        if (withdrawBtn) {
            withdrawBtn.disabled = false;
            withdrawBtn.textContent = `Withdraw ${amount} Tokens`;
        }
        
        hidePendingOverlay();
        showNotification('Gas estimation complete!', 'success');
        
    } catch (error) {
        hidePendingOverlay();
        console.error('Gas estimation error:', error);
        
        if (error.message.includes('insufficient funds')) {
            showNotification('Insufficient ETH for gas fees', 'error');
        } else {
            showNotification('Gas estimation failed: ' + error.message, 'error');
        }
    }
}

// Withdraw Tokens
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
        showPendingOverlay('Processing withdrawal...');
        
        // Convert amount to wei
        const decimals = await tokenContract.methods.decimals().call();
        const amountInWei = amount * Math.pow(10, decimals);
        
        // Get token symbol for display
        const tokenSymbol = await tokenContract.methods.symbol().call();
        
        // Send transaction
        const tx = await tokenContract.methods.transfer(
            recipient, 
            amountInWei.toString()
        ).send({ 
            from: userAccount,
            gas: 100000
        });
        
        // Update pending overlay
        const pendingTxHash = document.getElementById('pendingTxHash');
        const pendingText = document.getElementById('pendingText');
        
        if (pendingTxHash) {
            pendingTxHash.textContent = `Tx Hash: ${tx.transactionHash.substring(0, 20)}...`;
        }
        if (pendingText) {
            pendingText.textContent = `Transferring ${amount} ${tokenSymbol}...`;
        }
        
        // Wait for confirmation
        const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
        
        if (receipt.status) {
            // Success
            hidePendingOverlay();
            
            // Update wallet balance
            window.walletTokenBalance -= amount;
            window.totalWithdrawn = (window.totalWithdrawn || 0) + amount;
            
            // Update UI
            updateElement('walletTokenBalance', window.walletTokenBalance.toFixed(4));
            updateElement('totalWithdrawn', window.totalWithdrawn.toFixed(4));
            
            // Clear form
            if (amountInput) amountInput.value = '';
            
            // Add to transaction history
            addTransactionToHistory(tx.transactionHash, amount, recipient, 'success');
            
            showNotification(`✅ Successfully withdrew ${amount} ${tokenSymbol}!`, 'success');
            
            // Add activity
            if (typeof addActivity === 'function') {
                addActivity('Withdrawn', `${amount} ${tokenSymbol}`);
            }
            
            // Update balances
            await updateBalances();
            
        } else {
            // Failed
            hidePendingOverlay();
            showNotification('Transaction failed on-chain', 'error');
            addTransactionToHistory(tx.transactionHash, amount, recipient, 'failed');
        }
        
    } catch (error) {
        hidePendingOverlay();
        console.error('Withdrawal error:', error);
        
        if (error.message.includes('rejected') || error.code === 4001) {
            showNotification('Transaction rejected by user', 'error');
        } else if (error.message.includes('gas')) {
            showNotification('Transaction failed: Out of gas', 'error');
        } else {
            showNotification('Withdrawal failed: ' + error.message, 'error');
        }
    }
}

// Add Transaction to History
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
    
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const shortHash = txHash.substring(0, 10) + '...' + txHash.substring(txHash.length - 8);
    const shortRecipient = formatAddress(recipient);
    
    transactionItem.innerHTML = `
        <i class="fas fa-${status === 'success' ? 'check-circle' : 'times-circle'}"></i>
        <div class="transaction-details">
            <div class="transaction-amount">${amount} tokens</div>
            <div class="transaction-to">To: ${shortRecipient}</div>
            <div class="transaction-hash">${shortHash}</div>
        </div>
        <div class="transaction-time">${time}</div>
    `;
    
    transactionsList.insertBefore(transactionItem, transactionsList.firstChild);
    
    // Limit to 10 transactions
    const items = transactionsList.querySelectorAll('.transaction-item:not(.empty)');
    if (items.length > 10) {
        transactionsList.removeChild(items[items.length - 1]);
    }
}

// Refresh Transactions
function refreshTransactions() {
    if (!connected) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    updateBalances();
    showNotification('Balances refreshed!', 'success');
}

// Switch Network to Sepolia
async function switchToSepolia() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
        });
        showNotification('Switched to Sepolia!', 'success');
    } catch (error) {
        if (error.code === 4902) {
            // Add Sepolia network
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0xaa36a7',
                    chainName: 'Sepolia Test Network',
                    nativeCurrency: {
                        name: 'Sepolia ETH',
                        symbol: 'ETH',
                        decimals: 18
                    },
                    rpcUrls: ['https://rpc.sepolia.org'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io']
                }]
            });
        } else {
            showNotification('Failed to switch network', 'error');
        }
    }
}

// Switch Network to Mainnet
async function switchToMainnet() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x1' }],
        });
        showNotification('Switched to Mainnet!', 'success');
    } catch (error) {
        showNotification('Failed to switch network', 'error');
    }
}

// Export functions
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.estimateWithdrawGas = estimateWithdrawGas;
window.withdrawTokens = withdrawTokens;
window.refreshTransactions = refreshTransactions;
window.switchToSepolia = switchToSepolia;
window.switchToMainnet = switchToMainnet;
