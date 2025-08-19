require('dotenv').config();
const express = require('express');
const fs = require('fs');
const { promisify } = require('util');

const app = express();
app.use(express.json());

async function printToIware(data, devicePath = process.env.PRINTER_DEVICE_PATH) {
  try {
    // Write ke device menggunakan fs.writeFile
    await promisify(fs.writeFile)(devicePath, Buffer.from(data, 'binary'));

    return { success: true };
  } catch (error) {
    throw new Error(`Print failed: ${error.message}`);
  }
}

// data should be in the esc/pos-formatted string
app.post('/print', async (req, res) => {
  try {
    const { data, printer } = req.body;
    if (!data)
      return res.status(400).json({
        success: false,
        error: 'Data is required',
      });

    const printerOptions = {
      first_printer: process.env.FIRST_PRINTER || '',
      second_printer: process.env.SECOND_PRINTER || '',
      main_printer: process.env.MAIN_PRINTER || '',
    };

    const devicePath = printerOptions[printer];

    let printed = false;
    let lastError = '';

    try {
      await printToIware(data, devicePath);

      console.log(`✓ Printed successfully to ${devicePath ?? process.env.DEFAULT_DEVICE_PATH}`);
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
