const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'Bahari Receipt Printing',
  description: 'Prints receipts from the Bahari application.',
  script: path.join(__dirname, 'index.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', function() {
  svc.start();
  console.log('Install complete.');
  console.log('The service exists: ', svc.exists);
});

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall', function() {
  console.log('Uninstall complete.');
  console.log('The service exists: ', svc.exists);
});

// Install the service.
if (process.argv[2] === 'uninstall') {
  svc.uninstall();
} else {
  svc.install();
}
