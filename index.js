require('dotenv').config();
const express = require('express');
const { spawn } = require('child_process');
const { generateReceipt } = require('./esc');

const app = express();
app.use(express.json());

/**
 * Sends raw ESC/POS data to a printer on a Windows machine.
 * @param {Object} receiptData - Receipt data.
 * @param {string} printerName - The name of the printer as it appears in Windows. Defaults to PRINTER_DEVICE_PATH from .env.
 * @param {boolean} isChecker - If true, prints a simplified "checker" receipt.
 * @returns {Promise<{success: true}>}
 * @throws {Error} If printing fails.
 */
async function printToWindowsPrinter(receiptData, printerName = process.env.PRINTER_DEVICE_PATH, isChecker = false) {
  return new Promise((resolve, reject) => {
    if (!printerName) {
      return reject(new Error('Printer name is not specified. Please set PRINTER_DEVICE_PATH in your .env file or provide it in the request body as "devicePath".'));
    }

    const rawData = generateReceipt(receiptData, isChecker);
    
    // Use PowerShell to send raw data to the printer on Windows.
    // This requires PowerShell to be available in the system's PATH.
    const ps = spawn('powershell', ['-Command', `Out-Printer -Name "${printerName}" -InputObject $input`]);

    let stderr = '';
    ps.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    ps.on('close', (code) => {
        if (code === 0) {
            resolve({ success: true });
        } else {
            reject(new Error(`Printing failed. PowerShell process exited with code ${code}. Error: ${stderr}`));
        }
    });
    
    ps.on('error', (err) => {
        reject(new Error(`Failed to start PowerShell process: ${err.message}. Make sure PowerShell is installed and in your system's PATH.`));
    });

    // Write the raw ESC/POS data to the PowerShell process's standard input.
    ps.stdin.write(rawData, 'binary');
    ps.stdin.end();
  });
}

app.post('/print', async (req, res) => {
  try {
    // 'devicePath' from the request body is used as the Windows printer name.
    const { devicePath, data, isChecker } = req.body;
    data.date = new Date(data.date);

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required',
      });
    }

    const printerName = devicePath || process.env.PRINTER_DEVICE_PATH;
    
    try {
      await printToWindowsPrinter(data, printerName, isChecker);
      console.log(`✓ Print job sent to printer: ${printerName}`);
      res.json({ success: true, method: 'raw ESC/POS via PowerShell' });
    } catch (error) {
      console.log(`✗ Failed to print to ${printerName}: ${error.message}`);
      res.status(500).json({
        success: false,
        error: `Printing failed. Last error: ${error.message}`,
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
  console.log(`Raw Print Server for Windows running on port ${port}`);
  console.log('Make sure your printer name is set in the .env file (PRINTER_DEVICE_PATH) or passed in the request body (devicePath).');
  console.log('Example printer name: "EPSON TM-T82 Receipt"');
});
