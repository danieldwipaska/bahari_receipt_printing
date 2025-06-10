require('dotenv').config();
const express = require('express');
const fs = require('fs');
const { promisify } = require('util');
const { generateBahariIrishPubReceipt } = require('./esc');

const app = express();
app.use(express.json());

/**
 * Print with IWARE device
 * @param {Object} receiptData - Receipt data
 * @param {string} receiptData.storeName - Store name
 * @param {string} receiptData.address - Store Address
 * @param {Date} receiptData.date - Receipt date
 * @param {string} receiptData.receiptNumber - Receipt number
 * @param {string} receiptData.servedBy - Crew name who served
 * @param {string} receiptData.customerName - Customer name
 * @param {Object} receiptData.items - Order items
 * @param {string} receiptData.items.name - Item name
 * @param {number} receiptData.items.quantity - Item quantity or amount
 * @param {number} receiptData.items.price - Item price
 * @param {number} receiptData.subtotal - Receipt subtotal value
 * @param {number} receiptData.total - Receipt total value
 * @returns {Object} { success: true }
 * @throws {Error} If printing error
 */
async function printToIware(receiptData, devicePath = process.env.PRINTER_DEVICE_PATH) {
  try {
    // Write ke device menggunakan fs.writeFile
    await promisify(fs.writeFile)(devicePath, Buffer.from(generateBahariIrishPubReceipt(receiptData), 'binary'));

    return { success: true };
  } catch (error) {
    throw new Error(`Print failed: ${error.message}`);
  }
}

app.post('/print', async (req, res) => {
  try {
    const { devicePath, data } = req.body;
    if (!data)
      return res.status(400).json({
        success: false,
        error: 'Data is required',
      });

    let printed = false;
    let lastError = '';

    try {
      await printToIware(data, devicePath);
      console.log(`✓ Printed successfully to ${devicePath}`);
      printed = true;
    } catch (error) {
      lastError = error.message;
      console.log(`✗ Failed on ${devicePath}: ${error.message}`);
    }

    if (printed) {
      res.json({ success: true, method: 'raw ESC/POS' });
    } else {
      res.status(500).json({
        success: false,
        error: `All devices failed. Last error: ${lastError}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

const port = process.env.PORT || 3003;

app.listen(port, () => {
  console.log(`IWARE Raw Print server running on port ${port}`);
});
