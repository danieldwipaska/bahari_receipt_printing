const ESC_POS = {
    // Initialization
    INIT: '\x1b\x40',
    
    // Alignment
    ALIGN_LEFT: '\x1b\x61\x00',
    ALIGN_CENTER: '\x1b\x61\x01',
    ALIGN_RIGHT: '\x1b\x61\x02',
    
    // Text formatting
    BOLD_ON: '\x1b\x45\x01',
    BOLD_OFF: '\x1b\x45\x00',
    
    // Font size
    NORMAL: '\x1d\x21\x00',
    DOUBLE_HEIGHT: '\x1d\x21\x01',
    DOUBLE_WIDTH: '\x1d\x21\x10',
    DOUBLE_BOTH: '\x1d\x21\x11',
    
    // Font selection
    FONT_A: '\x1b\x4d\x00',
    FONT_B: '\x1b\x4d\x01',
    
    // Paper control
    NEWLINE: '\n',
    CUT_PAPER: '\x1d\x56\x00',

    RASTER_IMAGE: '\x1d\x76\x30\x00',
};

// Helper functions untuk layout
function padText(text, width, align = 'left') {
    if (text.length >= width) return text.substring(0, width);
    
    const spaces = width - text.length;
    switch(align) {
        case 'center':
            const leftSpaces = Math.floor(spaces / 2);
            const rightSpaces = spaces - leftSpaces;
            return ' '.repeat(leftSpaces) + text + ' '.repeat(rightSpaces);
        case 'right':
            return ' '.repeat(spaces) + text;
        default:
            return text + ' '.repeat(spaces);
    }
}

function createColumns(left, right, totalWidth = 32) {
    const rightWidth = right.length;
    const leftWidth = totalWidth - rightWidth;
    return padText(left, leftWidth, 'left') + padText(right, rightWidth, 'right');
}

function createDottedLine(length = 32) {
    return '-'.repeat(length);
}

function formatCurrency(amount) {
    return 'Rp ' + amount.toLocaleString('id-ID') + ',-';
}

function formatDate(date) {
    const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    return date.toLocaleDateString('en-GB', options);
}

function generateReceipt(data, isChecker) {
    let receipt = '';
    
    // Initialize printer
    receipt += ESC_POS.INIT;
    
    // Header - Store Name (Bold + Center + Double Height)
    receipt += ESC_POS.ALIGN_CENTER;
    receipt += ESC_POS.BOLD_ON;
    receipt += ESC_POS.DOUBLE_HEIGHT;
    receipt += data.storeName + ESC_POS.NEWLINE;
    receipt += ESC_POS.BOLD_OFF;
    receipt += ESC_POS.NORMAL;
    
    // Address (Center + Normal)
    receipt += data.address + ESC_POS.NEWLINE;
    
    // Dotted separator
    receipt += createDottedLine() + ESC_POS.NEWLINE;
    receipt += data.receiptNumber + ESC_POS.NEWLINE;
    receipt += createDottedLine() + ESC_POS.NEWLINE;
    
    // Date and Time (Left aligned)
    receipt += ESC_POS.ALIGN_LEFT;
    const [dateStr, timeStr] = formatDate(data.date).split(', ');
    receipt += createColumns(dateStr, timeStr) + ESC_POS.NEWLINE;
    
    // Receipt details
    receipt += createColumns('Served By', data.servedBy) + ESC_POS.NEWLINE;
    receipt += createColumns('Customer Name', data.customerName) + ESC_POS.NEWLINE;
    
    // Dotted separator
    receipt += createDottedLine() + ESC_POS.NEWLINE;
    
    // Items
    data.items.forEach(item => {
        const itemLine = item.name + ' x ' + item.quantity;
        const priceLine = formatCurrency(item.price * item.quantity);
        if (isChecker) {
            receipt += itemLine + ESC_POS.NEWLINE;
        } else {
            receipt += createColumns(itemLine, priceLine) + ESC_POS.NEWLINE;
        }

        if (item.discountPercent && !isChecker) {
            receipt += `  Discount ${item.discountPercent}%` + ESC_POS.NEWLINE;
        }
    });

    if (data.receiptType !== "PAY") {
        receipt += createColumns(data.receiptType, formatCurrency(data.total)) + ESC_POS.NEWLINE;
    }
    
    // Dotted separator
    receipt += createDottedLine() + ESC_POS.NEWLINE;
    
    if (!isChecker) {
        if (data.receiptType === 'PAY') {
            // Subtotal
            receipt += ESC_POS.NEWLINE;
            receipt += createColumns('Subtotal', formatCurrency(data.subtotal)) + ESC_POS.NEWLINE;
            receipt += createColumns(`Service ${data.includedTaxService ? '- included' : data.taxPercent}`, '') + ESC_POS.NEWLINE;
            receipt += createColumns(`Tax (PB1) ${data.includedTaxService ? '- included' : data.servicePercent}`, '') + ESC_POS.NEWLINE;
        }
        
        // Total (Bold)
        receipt += ESC_POS.NEWLINE;
        receipt += ESC_POS.BOLD_ON;
        receipt += createColumns('Total', formatCurrency(data.total)) + ESC_POS.NEWLINE;
        receipt += ESC_POS.BOLD_OFF;
        
        // Final dotted separator
        receipt += createDottedLine() + ESC_POS.NEWLINE;
    }
    
    // Note section
    receipt += ESC_POS.NEWLINE;
    receipt += 'Note:' + ESC_POS.NEWLINE;
    
    // Cut paper
    if (data.note) {
        receipt += data.note + ESC_POS.NEWLINE;
    }
    receipt += ESC_POS.NEWLINE;
    receipt += ESC_POS.NEWLINE;
    receipt += ESC_POS.NEWLINE;
    receipt += ESC_POS.CUT_PAPER;
    
    return receipt;
}

// Export for use in your Node.js application
module.exports = {
    generateReceipt,
    ESC_POS,
    formatCurrency,
    createColumns,
    padText
};