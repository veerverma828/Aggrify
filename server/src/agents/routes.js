const express = require('express');
const router = express.Router();
const { handleUserRequest } = require('./coordinator');

router.post('/chat', async (req, res) => {
    const { message, location, history } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (type, data) => {
        res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
        await handleUserRequest(message, location, history, sendEvent);
        sendEvent('done', { status: 'complete' });
    } catch (error) {
        console.error('Agent chat error:', error);
        sendEvent('error', { message: error.message });
    } finally {
        res.end();
    }
});

module.exports = router;
