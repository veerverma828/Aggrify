const express = require('express');
const path = require('path');
const { initBrowser, closeBrowser } = require('./server/src/features/search/services/browser');
const searchRoutes = require('./server/src/features/search/routes/searchRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from the 'frontend/dist' directory (for production)
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Mount API routes
app.use('/api', searchRoutes);

// Fallback for single page application (SPA) routing in production
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Start Server
initBrowser().then(() => {
  app.listen(PORT, () => {
    console.log('Server is running at http://localhost:' + PORT);
  });
}).catch(err => {
  console.error('Failed to start server due to browser initialization failure:', err);
  process.exit(1);
});

// Clean up browser on exit
const shutdown = async () => {
  console.log('Shutting down server...');
  await closeBrowser();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
