// Blockchain/Wallet Functions
let web3 = null;
let userAccount = null;
let connected = false;
let tokenContract = null;

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
        
        // Update UI
        updateElement('walletStatus', 'Connected ✓');
        updateElement('accountAddress', 
            userAccount.substring(0, 6) + '...' + userAccount.substring(38));
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
        
        // Get balances
        await updateBalances();
        
        showNotification('Wallet connected successfully!', 'success');
        
        if (!isSepolia) {
            showNotification('Switch to Sepolia for test tokens', 'warning');
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

// Handle Account Changes
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User disconnected wallet
        disconnectWallet();
    } else if (accounts[0] !== userAccount) {
        // User switched accounts
        userAccount = accounts[0];
        updateElement('accountAddress', 
            userAccount.substring(0, 6) + '...' + userAccount.substring(38));
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
    
    updateElement('walletStatus', 'Not Connected');
    updateElement('accountAddress', 'Not connected');
    updateElement('network', '-');
    updateElement('ethBalance', '0 ETH');
    
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.textContent = '🔗 Connect Wallet';
        connectBtn.disabled = false;
    }
    
    const walletStatus = document.querySelector('.wallet-status');
    if (walletStatus) {
        walletStatus.innerHTML = '<i class="fas fa-plug"></i><span>Not Connected</span>';
        walletStatus.classList.remove('connected');
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
        }
        
        // Get latest block
        const blockNumber = await web3.eth.getBlockNumber();
        updateElement('lastBlock', blockNumber);
        
    } catch (error) {
        console.error('Balance update error:', error);
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
        const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
        
        // Estimate gas
        const estimatedGas = await tokenContract.methods.transfer(
            recipient, 
            amountInWei
        ).estimateGas({ from: userAccount });
        
        // Get gas price
        const gasPrice = await web3.eth.getGasPrice();
        const gasCost = web3.utils.fromWei((BigInt(estimatedGas) * BigInt(gasPrice)).toString(), 'ether');
        
        // Update gas info display
        const gasInfo = document.getElementById('withdrawGasInfo');
        if (gasInfo) {
            gasInfo.innerHTML = `
                <i class="fas fa-gas-pump"></i>
                <div>
                    <strong>Gas Estimate</strong><br>
                    Units: ${estimatedGas.toLocaleString()}<br>
                    Price: ${parseFloat(web3.utils.fromWei(gasPrice, 'gwei')).toFixed(2)} Gwei<br>
                    Cost: ~${parseFloat(gasCost).toFixed(6)} ETH
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
        const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
        
        // Send transaction
        const tx = await tokenContract.methods.transfer(
            recipient, 
            amountInWei
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
            pendingText.textContent = 'Waiting for confirmation...';
        }
        
        // Wait for confirmation
        const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
        
        if (receipt.status) {
            // Success
            hidePendingOverlay();
            
            // Update wallet balance
            window.walletTokenBalance -= amount;
            window.totalWithdrawn += amount;
            
            // Update UI
            updateElement('walletTokenBalance', window.walletTokenBalance.toFixed(4));
            updateElement('totalWithdrawn', window.totalWithdrawn);
            
            // Clear form
            if (amountInput) amountInput.value = '';
            
            // Add to transaction history
            addTransactionToHistory(tx.transactionHash, amount, recipient, 'success');
            
            showNotification(`✅ Successfully withdrew ${amount} tokens!`, 'success');
            
            // Add activity
            if (typeof addActivity === 'function') {
                addActivity('Withdrawn', `${amount} tokens`);
            }
            
        } else {
            // Failed
            hidePendingOverlay();
            showNotification('Transaction failed on-chain', 'error');
            addTransactionToHistory(tx.transactionHash, amount, recipient, 'failed');
        }
        
    } catch (error) {
        hidePendingOverlay();
        console.error('Withdrawal error:', error);
        
        if (error.message.includes('rejected')) {
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
    
    const time = new Date().toLocaleTimeString();
    const shortHash = txHash.substring(0, 10) + '...' + txHash.substring(62);
    const shortRecipient = recipient.substring(0, 6) + '...' + recipient.substring(38);
    
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

// Export functions
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.estimateWithdrawGas = estimateWithdrawGas;
window.withdrawTokens = withdrawTokens;
window.refreshTransactions = refreshTransactions;
window.switchToSepolia = switchToSepolia;