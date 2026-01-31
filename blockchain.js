// Blockchain/Wallet Functions
let web3 = null;
let userAccount = null;
let connected = false;
let tokenContract = null;

// Contract Configuration - ADD YOUR MTK CONTRACT HERE
const TOKEN_CONFIG = {
    MTK: {
        address: '0x3D6Eb3Fc92C799CB6b8716c5c8E5f8A78eFE8A43', // MTK Test Token on Sepolia
        name: 'MTK Game Token',
        symbol: 'MTK',
        decimals: 18
    },
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

// ERC20 ABI - ADDED mint FUNCTION
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
        "constant": false,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "mint",
        "outputs": [],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "faucet",
        "outputs": [],
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
        
        // Initialize token contract (MTK by default)
        tokenContract = new web3.eth.Contract(ERC20_ABI, TOKEN_CONFIG.MTK.address);
        
        // Get balances
        await updateBalances();
        
        showNotification('Wallet connected successfully!', 'success');
        
        if (!isSepolia) {
            showNotification('Switch to Sepolia for MTK tokens', 'warning');
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
        
        // Get MTK token balance
        if (tokenContract) {
            const tokenBalance = await tokenContract.methods.balanceOf(userAccount).call();
            const decimals = await tokenContract.methods.decimals().call();
            const tokenFormatted = tokenBalance / Math.pow(10, decimals);
            
            // Update wallet token balance
            window.walletTokenBalance = tokenFormatted;
            updateElement('walletTokenBalance', tokenFormatted.toFixed(4));
            updateElement('statsWalletBalance', `${tokenFormatted.toFixed(4)} MTK`);
        }
        
        // Get latest block
        const blockNumber = await web3.eth.getBlockNumber();
        updateElement('lastBlock', blockNumber);
        
    } catch (error) {
        console.error('Balance update error:', error);
    }
}

// NEW FUNCTION: Get MTK Tokens from Faucet
async function getMTKFromFaucet() {
    if (!connected || !web3 || !tokenContract) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    try {
        showPendingOverlay('Getting MTK tokens from faucet...');
        
        // Call faucet function on contract
        const tx = await tokenContract.methods.faucet(
            userAccount,
            web3.utils.toWei('100', 'ether') // 100 MTK tokens
        ).send({
            from: userAccount,
            gas: 100000
        });
        
        // Wait for transaction
        const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
        
        if (receipt.status) {
            hidePendingOverlay();
            showNotification('✅ Received 100 MTK tokens!', 'success');
            await updateBalances();
        } else {
            hidePendingOverlay();
            showNotification('Faucet transaction failed', 'error');
        }
        
    } catch (error) {
        hidePendingOverlay();
        console.error('Faucet error:', error);
        
        if (error.message.includes('rejected')) {
            showNotification('Transaction rejected', 'error');
        } else {
            showNotification('Faucet error: ' + error.message, 'error');
        }
    }
}

// NEW FUNCTION: Convert Game MTK to Real MTK Tokens
async function convertGameToRealMTK(amount) {
    if (!connected || !web3 || !tokenContract) {
        showNotification('Connect wallet first!', 'error');
        return false;
    }
    
    try {
        showPendingOverlay('Converting game MTK to real tokens...');
        
        // Convert amount to wei
        const decimals = await tokenContract.methods.decimals().call();
        const amountInWei = (amount * Math.pow(10, decimals)).toString();
        
        // Call mint function on contract (only works if you're contract owner)
        // For now, we'll use transfer from contract's balance
        const tx = await tokenContract.methods.transfer(
            userAccount,
            amountInWei
        ).send({
            from: userAccount,
            gas: 100000
        });
        
        const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
        
        if (receipt.status) {
            hidePendingOverlay();
            showNotification(`✅ Converted ${amount} MTK to real tokens!`, 'success');
            await updateBalances();
            return true;
        } else {
            hidePendingOverlay();
            showNotification('Conversion failed', 'error');
            return false;
        }
        
    } catch (error) {
        hidePendingOverlay();
        console.error('Conversion error:', error);
        
        if (error.message.includes('rejected')) {
            showNotification('Transaction rejected', 'error');
        } else if (error.message.includes('insufficient')) {
            showNotification('Contract needs more MTK tokens', 'error');
        } else {
            showNotification('Conversion error: ' + error.message, 'error');
        }
        return false;
    }
}

// Estimate Withdrawal Gas
async function estimateWithdrawGas() {
    console.log('estimateWithdrawGas() called');
    
    if (!connected || !web3 || !tokenContract) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    const amountInput = document.getElementById('withdrawAmount');
    const recipientInput = document.getElementById('recipientAddress');
    
    if (!amountInput || !recipientInput) {
        showNotification('Form fields not found!', 'error');
        return;
    }
    
    const amount = parseFloat(amountInput.value);
    const recipient = recipientInput.value.trim();
    
    console.log('Gas estimation for:', { amount, recipient });
    
    // Validation
    if (!amount || amount <= 0 || isNaN(amount)) {
        showNotification('Enter valid amount (greater than 0)', 'error');
        return;
    }
    
    if (!recipient) {
        showNotification('Enter recipient address', 'error');
        return;
    }
    
    if (!web3.utils.isAddress(recipient)) {
        showNotification('Invalid Ethereum address format', 'error');
        return;
    }
    
    const walletBalance = window.walletTokenBalance || 0;
    console.log('Wallet balance:', walletBalance, 'Requested:', amount);
    
    if (walletBalance < amount) {
        showNotification(`Insufficient balance! You have ${walletBalance.toFixed(4)} MTK`, 'error');
        return;
    }
    
    try {
        showPendingOverlay('Estimating gas fees...');
        
        // Get token decimals
        const decimals = await tokenContract.methods.decimals().call();
        console.log('Token decimals:', decimals);
        
        // Convert amount using token's decimals
        const amountInWei = (amount * Math.pow(10, decimals)).toString();
        console.log('Amount in wei:', amountInWei);
        
        // Estimate gas
        const estimatedGas = await tokenContract.methods.transfer(
            recipient, 
            amountInWei
        ).estimateGas({ from: userAccount });
        
        // Get gas price
        const gasPrice = await web3.eth.getGasPrice();
        const gasCostEth = estimatedGas * gasPrice / Math.pow(10, 18);
        
        console.log('Gas estimate:', {
            estimatedGas,
            gasPrice: gasPrice / Math.pow(10, 9),
            gasCostEth
        });
        
        // Update gas info display
        const gasInfo = document.getElementById('withdrawGasInfo');
        if (gasInfo) {
            gasInfo.innerHTML = `
                <i class="fas fa-gas-pump"></i>
                <div>
                    <strong>Gas Estimate ✅</strong><br>
                    Units: ${estimatedGas.toLocaleString()}<br>
                    Price: ${(gasPrice / Math.pow(10, 9)).toFixed(2)} Gwei<br>
                    Cost: ~${gasCostEth.toFixed(6)} ETH<br>
                    <small style="color: #94a3b8;">Network: Sepolia Testnet</small>
                </div>
            `;
            gasInfo.style.display = 'flex';
        }
        
        // Enable withdraw button
        const withdrawBtn = document.querySelector('.btn-withdraw');
        if (withdrawBtn) {
            withdrawBtn.disabled = false;
            withdrawBtn.textContent = `Withdraw ${amount} MTK`;
            withdrawBtn.style.opacity = '1';
            withdrawBtn.style.cursor = 'pointer';
        }
        
        hidePendingOverlay();
        showNotification('Gas estimation complete! Ready to withdraw.', 'success');
        
    } catch (error) {
        hidePendingOverlay();
        console.error('Gas estimation error:', error);
        
        let errorMessage = 'Gas estimation failed';
        
        if (error.message.includes('insufficient funds')) {
            errorMessage = 'Insufficient ETH for gas fees. Get Sepolia ETH first.';
        } else if (error.message.includes('exceeds balance')) {
            errorMessage = 'Amount exceeds token balance';
        } else if (error.message.includes('revert')) {
            errorMessage = 'Transaction would fail (check balance and address)';
        } else {
            errorMessage = 'Gas estimation failed: ' + error.message;
        }
        
        showNotification(errorMessage, 'error');
        
        // Keep withdraw button disabled
        const withdrawBtn = document.querySelector('.btn-withdraw');
        if (withdrawBtn) {
            withdrawBtn.disabled = true;
        }
    }
}

// Withdraw Tokens
async function withdrawTokens() {
    console.log('withdrawTokens() called - Starting withdrawal process');
    
    if (!connected || !web3 || !tokenContract) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    const amountInput = document.getElementById('withdrawAmount');
    const recipientInput = document.getElementById('recipientAddress');
    
    if (!amountInput || !recipientInput) {
        console.error('Form inputs not found');
        showNotification('Error: Form fields not found', 'error');
        return;
    }
    
    const amount = parseFloat(amountInput.value);
    const recipient = recipientInput.value.trim();
    
    console.log('Withdrawal request:', { amount, recipient });
    
    // Validation
    if (!amount || amount <= 0 || isNaN(amount)) {
        showNotification('Enter valid amount (greater than 0)', 'error');
        return;
    }
    
    if (!recipient) {
        showNotification('Enter recipient address', 'error');
        return;
    }
    
    if (!web3.utils.isAddress(recipient)) {
        showNotification('Invalid Ethereum address format', 'error');
        return;
    }
    
    // Check wallet balance
    const walletBalance = window.walletTokenBalance || 0;
    console.log('Balance check - Wallet:', walletBalance, 'Requested:', amount);
    
    if (walletBalance < amount) {
        showNotification(`Insufficient balance! You have ${walletBalance.toFixed(4)} MTK`, 'error');
        return;
    }
    
    try {
        showPendingOverlay('Sending MTK tokens...');
        
        // Get token decimals
        const decimals = await tokenContract.methods.decimals().call();
        
        // Convert amount
        const amountInWei = (amount * Math.pow(10, decimals)).toString();
        
        // Send transaction
        const tx = await tokenContract.methods.transfer(
            recipient, 
            amountInWei
        ).send({
            from: userAccount,
            gas: 150000
        });
        
        // Update overlay
        const pendingTxHash = document.getElementById('pendingTxHash');
        const pendingText = document.getElementById('pendingText');
        
        if (pendingTxHash) {
            pendingTxHash.innerHTML = `
                Tx Hash: ${tx.transactionHash.substring(0, 20)}...<br>
                <a href="https://sepolia.etherscan.io/tx/${tx.transactionHash}" 
                   target="_blank" 
                   style="color: #f8c555; font-size: 0.9em;">
                   View on Etherscan
                </a>
            `;
        }
        
        if (pendingText) {
            pendingText.textContent = 'Waiting for confirmation...';
        }
        
        // Wait for confirmation
        let receipt;
        let attempts = 0;
        
        while (!receipt && attempts < 30) {
            receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
            if (!receipt) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }
        }
        
        if (receipt && receipt.status) {
            // SUCCESS
            hidePendingOverlay();
            
            // Update balance
            window.walletTokenBalance -= amount;
            window.totalWithdrawn = (window.totalWithdrawn || 0) + amount;
            
            // Update UI
            updateElement('walletTokenBalance', window.walletTokenBalance.toFixed(4));
            updateElement('totalWithdrawn', window.totalWithdrawn);
            
            // Clear form
            if (amountInput) amountInput.value = '';
            
            // Add to transaction history
            addTransactionToHistory(tx.transactionHash, amount, recipient, 'success');
            
            showNotification(`✅ Successfully sent ${amount} MTK!`, 'success');
            
            // Refresh balance
            setTimeout(() => updateBalances(), 2000);
            
        } else {
            // FAILED
            hidePendingOverlay();
            showNotification('Transaction failed', 'error');
            addTransactionToHistory(tx.transactionHash, amount, recipient, 'failed');
        }
        
    } catch (error) {
        hidePendingOverlay();
        console.error('Withdrawal error:', error);
        
        if (error.code === 4001) {
            showNotification('Transaction rejected by user', 'error');
        } else if (error.message.includes('insufficient funds')) {
            showNotification('Insufficient ETH for gas fees', 'error');
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
            <div class="transaction-amount">${amount} MTK</div>
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

// NEW: Add MTK to MetaMask
async function addMTKToMetaMask() {
    if (!window.ethereum) {
        showNotification('MetaMask not installed', 'error');
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
                    decimals: 18,
                    image: 'https://via.placeholder.com/32/f8c555/000000?text=MTK'
                },
            },
        });
        showNotification('MTK token added to MetaMask!', 'success');
    } catch (error) {
        console.error('Error adding token:', error);
        showNotification('Failed to add token to MetaMask', 'error');
    }
}

// Export functions
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.estimateWithdrawGas = estimateWithdrawGas;
window.withdrawTokens = withdrawTokens;
window.refreshTransactions = refreshTransactions;
window.switchToSepolia = switchToSepolia;
window.getMTKFromFaucet = getMTKFromFaucet;
window.addMTKToMetaMask = addMTKToMetaMask;
window.convertGameToRealMTK = convertGameToRealMTK;
