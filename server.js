const express = require('express');
const path = require('path');
const { initBrowser, closeBrowser } = require('./server/src/features/search/services/browser');
const searchRoutes = require('./server/src/features/search/routes/searchRoutes');
const agentRoutes = require('./server/src/agents/routes');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Serve static files from the 'frontend/dist' directory (for production)
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Mount API routes
app.use('/api', searchRoutes);
app.use('/api/agent', agentRoutes);


// Fallback for single page application (SPA) routing in production
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log('Server is running at http://0.0.0.0:' + PORT);
  
  // Pre-warm headless browser in the background
  initBrowser().then(() => {
    console.log('Headless browser pre-warmed and ready.');
  }).catch(err => {
    console.error('Warning: Failed to pre-warm headless browser. It will retry when a request arrives:', err.message);
  });
});

// Clean up browser on exit
const shutdown = async () => {
  console.log('Shutting down server...');
  await closeBrowser();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
