const http = require('http');

function testPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/search?q=milk`, (res) => {
      console.log(`Port ${port} responded with status: ${res.statusCode}`);
      res.on('data', (chunk) => {
        console.log(`Port ${port} data:`, chunk.toString());
      });
      res.on('end', () => {
        resolve(true);
      });
    });
    req.on('error', (err) => {
      console.log(`Port ${port} error:`, err.message);
      resolve(false);
    });
  });
}

async function run() {
  await testPort(3000);
  await testPort(5000);
}

run();
