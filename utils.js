// Utility Functions

// Show Notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <div class="notification-content">
            <div class="notification-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="notification-message">${message}</div>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

// Show Pending Overlay
function showPendingOverlay(message = 'Processing...') {
    const overlay = document.getElementById('pendingOverlay');
    const text = document.getElementById('pendingText');
    
    if (overlay) {
        overlay.classList.add('active');
    }
    if (text) {
        text.textContent = message;
    }
}

// Hide Pending Overlay
function hidePendingOverlay() {
    const overlay = document.getElementById('pendingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// Update Element Content
function updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    }
}

// Format Address
function formatAddress(address, start = 6, end = 4) {
    if (!address || address.length < start + end) return address;
    return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
}

// Format Number
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined) return '0';
    
    if (num >= 1000000) {
        return (num / 1000000).toFixed(decimals) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(decimals) + 'K';
    } else {
        return num.toFixed(decimals);
    }
}

// Generate Random ID
function generateId(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length);
}

// Debounce Function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle Function
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Validate Ethereum Address
function isValidEthAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Copy to Clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

// Export utility functions
window.showNotification = showNotification;
window.showPendingOverlay = showPendingOverlay;
window.hidePendingOverlay = hidePendingOverlay;
window.updateElement = updateElement;
window.formatAddress = formatAddress;
window.formatNumber = formatNumber;
window.generateId = generateId;
window.debounce = debounce;
window.throttle = throttle;
window.isValidEthAddress = isValidEthAddress;
window.copyToClipboard = copyToClipboard;