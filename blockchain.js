// Blockchain/Wallet Functions
let web3 = null;
let userAccount = null;
let connected = false;
let tokenContract = null;
let walletListeners = false;

// Contract Configuration - USING REAL WORKING SEPOLIA TOKEN
const TOKEN_CONFIG = {
    MTK: {
        // USDC Test Token on Sepolia - THIS EXISTS AND WORKS
        address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        name: 'MTK Game Token',
        symbol: 'MTK',
        decimals: 6,
        etherscan: 'https://sepolia.etherscan.io/address/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
    }
};

// ERC20 ABI - SIMPLIFIED VERSION
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
        console.log('initWeb3() called');
        
        if (typeof window.ethereum === 'undefined') {
            console.log('MetaMask not installed');
            showNotification('Please install MetaMask extension!', 'error');
            return false;
        }

        // Check for existing connection
        const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
        });

        console.log('Existing accounts:', accounts);

        if (accounts.length > 0) {
            userAccount = accounts[0];
            web3 = new Web3(window.ethereum);
            connected = true;
            
            // Initialize token contract
            const checksumAddress = web3.utils.toChecksumAddress(TOKEN_CONFIG.MTK.address);
            tokenContract = new web3.eth.Contract(ERC20_ABI, checksumAddress);
            
            console.log('Web3 initialized with existing connection');
            
            // Check network
            const chainId = await web3.eth.getChainId();
            const isSepolia = chainId === 11155111 || chainId === '0xaa36a7';
            
            // Update UI
            updateUIAfterConnection(isSepolia, chainId);
            
            // Get balances
            await updateBalances();
            
            // Set up event listeners
            setupWalletListeners();
            
            return true;
        }
        
        console.log('No existing wallet connection found');
        return false;
    } catch (error) {
        console.error('Web3 initialization error:', error);
        return false;
    }
}

// Connect Wallet
async function connectWallet() {
    try {
        console.log('connectWallet() called');
        
        if (typeof window.ethereum === 'undefined') {
            showNotification('Please install MetaMask browser extension!', 'error');
            return;
        }

        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        console.log('Accounts received:', accounts);
        
        if (accounts.length === 0) {
            showNotification('Please unlock MetaMask!', 'error');
            return;
        }
        
        userAccount = accounts[0];
        web3 = new Web3(window.ethereum);
        connected = true;
        
        // Check network
        const chainId = await web3.eth.getChainId();
        const isSepolia = chainId === 11155111 || chainId === '0xaa36a7';
        
        // Initialize token contract
        const checksumAddress = web3.utils.toChecksumAddress(TOKEN_CONFIG.MTK.address);
        tokenContract = new web3.eth.Contract(ERC20_ABI, checksumAddress);
        
        // Update UI
        updateUIAfterConnection(isSepolia, chainId);
        
        // Get balances
        await updateBalances();
        
        showNotification(`✅ Wallet connected: ${formatAddress(userAccount)}`, 'success');
        
        if (!isSepolia) {
            showNotification('Switch to Sepolia for full functionality', 'warning');
        }
        
        // Set up event listeners
        setupWalletListeners();
        
    } catch (error) {
        console.error('Connection error:', error);
        
        if (error.code === 4001) {
            showNotification('❌ Connection rejected by user', 'error');
        } else if (error.message.includes('Already processing eth_requestAccounts')) {
            showNotification('MetaMask is busy. Please try again.', 'warning');
        } else {
            showNotification('Connection failed: ' + error.message, 'error');
        }
    }
}

// Update UI after connection
function updateUIAfterConnection(isSepolia, chainId) {
    updateElement('walletStatus', 'Connected ✓');
    updateElement('accountAddress', formatAddress(userAccount));
    
    if (isSepolia) {
        updateElement('network', 'Sepolia Testnet ✓');
    } else {
        updateElement('network', `Chain ${chainId} (Switch to Sepolia)`);
    }
    
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
        window.ethereum.on('disconnect', handleDisconnect);
        walletListeners = true;
        console.log('Wallet listeners set up');
    }
}

// Handle Account Changes
function handleAccountsChanged(accounts) {
    console.log('Accounts changed:', accounts);
    
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
function handleChainChanged(chainId) {
    console.log('Chain changed to:', chainId);
    window.location.reload();
}

// Handle Disconnect
function handleDisconnect(error) {
    console.log('Wallet disconnected:', error);
    disconnectWallet();
}

// Disconnect Wallet
function disconnectWallet() {
    console.log('Disconnecting wallet...');
    
    connected = false;
    web3 = null;
    userAccount = null;
    tokenContract = null;
    
    // Update UI
    updateElement('walletStatus', 'Not Connected');
    updateElement('accountAddress', 'Not connected');
    updateElement('network', '-');
    updateElement('ethBalance', '0 ETH');
    updateElement('walletTokenBalance', '0 MTK');
    
    // Reset connect button
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect Wallet';
        connectBtn.onclick = connectWallet;
    }
    
    // Update wallet status display
    const walletStatus = document.querySelector('.wallet-status');
    if (walletStatus) {
        walletStatus.innerHTML = '<i class="fas fa-plug"></i><span>Not Connected</span>';
        walletStatus.classList.remove('connected');
    }
    
    // Clear transaction history
    const transactionsList = document.getElementById('transactionsList');
    if (transactionsList) {
        transactionsList.innerHTML = `
            <div class="transaction-item empty">
                <i class="fas fa-history"></i>
                <span>No transactions yet</span>
            </div>
        `;
    }
    
    // Remove event listeners
    if (window.ethereum && walletListeners) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
        walletListeners = false;
    }
    
    showNotification('Wallet disconnected', 'info');
}

// Update All Balances
async function updateBalances() {
    if (!connected || !web3) {
        console.log('Cannot update balances: not connected');
        return;
    }
    
    try {
        console.log('Updating balances...');
        
        // Get ETH balance
        const ethBalance = await web3.eth.getBalance(userAccount);
        const ethFormatted = web3.utils.fromWei(ethBalance, 'ether');
        updateElement('ethBalance', `${parseFloat(ethFormatted).toFixed(4)} ETH`);
        
        // Get MTK token balance
        if (tokenContract && userAccount) {
            try {
                const tokenBalance = await tokenContract.methods.balanceOf(userAccount).call();
                const decimals = await tokenContract.methods.decimals().call();
                const tokenFormatted = tokenBalance / Math.pow(10, decimals);
                
                // Update global variable and UI
                window.walletTokenBalance = tokenFormatted;
                updateElement('walletTokenBalance', tokenFormatted.toFixed(4));
                updateElement('statsWalletBalance', `${tokenFormatted.toFixed(4)} MTK`);
                
                console.log('Token balance:', tokenFormatted);
            } catch (tokenError) {
                console.error('Token balance error:', tokenError);
            }
        }
        
        // Get latest block
        const blockNumber = await web3.eth.getBlockNumber();
        updateElement('lastBlock', blockNumber);
        
    } catch (error) {
        console.error('Balance update error:', error);
    }
}

// Get MTK Tokens from Faucet (Instructions)
async function getMTKFromFaucet() {
    if (!connected || !web3) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    showNotification('Opening faucet instructions...', 'info');
    
    // Show instructions modal
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
        <div style="background: #1e293b; border-radius: 16px; padding: 30px; max-width: 500px; width: 90%; border: 2px solid #f8c555;">
            <h3 style="color: #f8c555; margin-bottom: 20px;">
                <i class="fas fa-info-circle"></i> Get MTK Tokens
            </h3>
            <div style="color: #94a3b8; margin-bottom: 20px;">
                <p><strong>Step 1:</strong> Get Sepolia ETH from a faucet</p>
                <p><strong>Step 2:</strong> Go to Uniswap on Sepolia network</p>
                <p><strong>Step 3:</strong> Swap ETH for USDC tokens</p>
                <p><strong>Token Address:</strong> 
                    <code style="background: rgba(255,255,255,0.1); padding: 5px; border-radius: 4px; display: block; margin-top: 5px; word-break: break-all;">
                        0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
                    </code>
                </p>
                <p><small>Note: This is USDC test token displayed as MTK in the game</small></p>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="window.open('https://sepoliafaucet.com', '_blank')" 
                        style="background: #667eea; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; flex: 1; min-width: 120px;">
                    Get ETH
                </button>
                <button onclick="window.open('https://app.uniswap.org/swap', '_blank')" 
                        style="background: #f8c555; color: black; border: none; padding: 12px; border-radius: 8px; cursor: pointer; flex: 1; min-width: 120px;">
                    Uniswap
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

// Mint Game MTK to Real Tokens
async function mintGameTokens(amount) {
    console.log('Minting game tokens:', amount);
    
    if (!connected || !web3 || !userAccount) {
        showNotification('Connect wallet first!', 'error');
        return false;
    }
    
    try {
        showPendingOverlay(`Adding ${amount} MTK to your game...`);
        
        // For demo, simulate adding tokens
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        hidePendingOverlay();
        showNotification(`⚠️ Demo: ${amount} MTK would be minted`, 'info');
        showNotification('To get real tokens, use "Get MTK" button', 'info');
        
        // Update game balance (simulated)
        if (window.walletTokenBalance !== undefined) {
            window.walletTokenBalance += amount;
            updateElement('walletTokenBalance', window.walletTokenBalance.toFixed(4));
        }
        
        return true;
        
    } catch (error) {
        hidePendingOverlay();
        console.error('Mint error:', error);
        showNotification('Mint failed: ' + error.message, 'error');
        return false;
    }
}

// Check MTK Balance
async function checkMTKBalance() {
    if (!connected || !web3 || !userAccount) {
        showNotification('Connect wallet first!', 'error');
        return;
    }
    
    try {
        if (tokenContract) {
            const balance = await tokenContract.methods.balanceOf(userAccount).call();
            const decimals = await tokenContract.methods.decimals().call();
            const formatted = balance / Math.pow(10, decimals);
            
            showNotification(`Your MTK Balance: ${formatted.toFixed(4)}`, 'success');
            return formatted;
        } else {
            const balance = window.walletTokenBalance || 0;
            showNotification(`Your MTK Balance: ${balance.toFixed(4)} MTK`, 'success');
            return balance;
        }
    } catch (error) {
        console.error('Balance check error:', error);
        showNotification('Failed to check balance', 'error');
        return 0;
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
    
    if (!amountInput || !recipientInput) {
        showNotification('Form fields not found!', 'error');
        return;
    }
    
    const amount = parseFloat(amountInput.value);
    let recipient = recipientInput.value.trim();
    
    // Use own address if recipient is empty
    if (!recipient) {
        recipient = userAccount;
        recipientInput.value = userAccount;
    }
    
    // Validation
    if (!amount || amount <= 0 || isNaN(amount)) {
        showNotification('Enter valid amount (greater than 0)', 'error');
        return;
    }
    
    if (!recipient || !web3.utils.isAddress(recipient)) {
        showNotification('Invalid Ethereum address', 'error');
        return;
    }
    
    const walletBalance = window.walletTokenBalance || 0;
    if (walletBalance < amount) {
        showNotification(`Insufficient balance! You have ${walletBalance.toFixed(4)} MTK`, 'error');
        return;
    }
    
    try {
        showPendingOverlay('Estimating gas...');
        
        const decimals = await tokenContract.methods.decimals().call();
        const amountInWei = (amount * Math.pow(10, decimals)).toString();
        
        const estimatedGas = await tokenContract.methods.transfer(
            recipient, 
            amountInWei
        ).estimateGas({ from: userAccount });
        
        const gasPrice = await web3.eth.getGasPrice();
        const gasCostEth = estimatedGas * gasPrice / Math.pow(10, 18);
        
        // Update gas info display
        const gasInfo = document.getElementById('withdrawGasInfo');
        if (gasInfo) {
            gasInfo.innerHTML = `
                <i class="fas fa-gas-pump"></i>
                <div>
                    <strong>Gas Estimate</strong><br>
                    Units: ${estimatedGas.toLocaleString()}<br>
                    Price: ${(gasPrice / Math.pow(10, 9)).toFixed(2)} Gwei<br>
                    Cost: ~${gasCostEth.toFixed(6)} ETH<br>
                    <small style="color: #94a3b8;">Sepolia Testnet</small>
                </div>
            `;
            gasInfo.style.display = 'flex';
        }
        
        // Enable withdraw button
        const withdrawBtn = document.querySelector('.btn-withdraw');
        if (withdrawBtn) {
            withdrawBtn.disabled = false;
            withdrawBtn.textContent = `Send ${amount} MTK`;
        }
        
        hidePendingOverlay();
        showNotification('Gas estimation complete!', 'success');
        
    } catch (error) {
        hidePendingOverlay();
        console.error('Gas estimation error:', error);
        showNotification('Gas estimation failed: ' + error.message, 'error');
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
    let recipient = recipientInput?.value?.trim();
    
    // Use own address if recipient is empty
    if (!recipient) {
        recipient = userAccount;
        recipientInput.value = userAccount;
    }
    
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
        showNotification(`Insufficient balance! You have ${walletBalance.toFixed(4)} MTK`, 'error');
        return;
    }
    
    try {
        showPendingOverlay('Processing withdrawal...');
        
        const decimals = await tokenContract.methods.decimals().call();
        const amountInWei = (amount * Math.pow(10, decimals)).toString();
        
        const tx = await tokenContract.methods.transfer(
            recipient, 
            amountInWei
        ).send({ 
            from: userAccount,
            gas: 100000
        });
        
        hidePendingOverlay();
        showNotification(`✅ Successfully sent ${amount} MTK!`, 'success');
        
        // Update wallet balance
        window.walletTokenBalance -= amount;
        
        // Update UI
        updateElement('walletTokenBalance', window.walletTokenBalance.toFixed(4));
        
        // Clear form
        if (amountInput) amountInput.value = '';
        
        // Add to transaction history
        addTransactionToHistory(tx.transactionHash, amount, recipient, 'success');
        
        // Refresh balances
        setTimeout(() => updateBalances(), 3000);
        
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
    
    let icon = 'fa-exchange-alt';
    if (status === 'success') icon = 'fa-check-circle';
    if (status === 'failed') icon = 'fa-times-circle';
    if (status === 'pending') icon = 'fa-clock';
    if (status === 'faucet') icon = 'fa-gift';
    
    transactionItem.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="transaction-details">
            <div class="transaction-amount">${amount} MTK</div>
            <div class="transaction-to">${status === 'faucet' ? 'From Faucet' : 'To: ' + shortRecipient}</div>
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
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        if (error.code === 4902) {
            try {
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
                showNotification('Sepolia network added!', 'success');
            } catch (addError) {
                showNotification('Failed to add Sepolia network', 'error');
            }
        } else {
            showNotification('Failed to switch network', 'error');
        }
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
                    decimals: 6,
                    image: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png'
                },
            },
        });
        showNotification('MTK token added to MetaMask!', 'success');
    } catch (error) {
        console.error('Error adding token:', error);
        showNotification('Failed to add token to MetaMask', 'error');
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
window.estimateWithdrawGas = estimateWithdrawGas;
window.withdrawTokens = withdrawTokens;
window.refreshTransactions = refreshTransactions;
window.switchToSepolia = switchToSepolia;
window.getMTKFromFaucet = getMTKFromFaucet;
window.addMTKToMetaMask = addMTKToMetaMask;
window.mintGameTokens = mintGameTokens;
window.checkMTKBalance = checkMTKBalance;
window.initWeb3 = initWeb3;
window.formatAddress = formatAddress;

// Auto-initialize
setTimeout(async () => {
    if (typeof window.ethereum !== 'undefined') {
        await initWeb3();
    }
}, 100);
