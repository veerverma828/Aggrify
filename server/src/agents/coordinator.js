const { ai } = require('./geminiClient');
const { searchProductsSkill } = require('./skills/searchSkill');
const { optimizeBasketSkill } = require('./skills/optimizationSkill');
const { analyzeDealsSkill } = require('./skills/dealsSkill');

async function handleUserRequest(message, location, history, sendEvent) {
    sendEvent('status', { agent: 'Coordinator', message: 'Analyzing request...', state: 'running' });

    try {
        const results = {};
        const allProducts = [];

        // Define Tools/Skills
        const searchTool = {
            name: "search_products",
            description: "Search for products across grocery stores (Blinkit, Zepto, Instamart). Use this to find prices.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The product to search for, e.g. 'milk' or 'bread'"
                    }
                },
                required: ["query"]
            }
        };

        const optimizeTool = {
            name: "optimize_basket",
            description: "Find the cheapest combination of items across stores to fulfill a shopping list.",
            parameters: {
                type: "object",
                properties: {
                    targetItems: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of items the user wants to buy"
                    }
                },
                required: ["targetItems"]
            }
        };

        const dealsTool = {
            name: "analyze_deals",
            description: "Find the best deals or discounts among the scraped products.",
            parameters: {
                type: "object",
                properties: {}
            }
        };

        const systemInstruction = `You are the Shopping Coordinator Agent for an AI Grocery Platform.
Your goal is to help the user by breaking down their request, using your tools to search products, optimize the basket, and find deals.
Always call tools when you need information. Once you have enough data, provide a helpful and analytical response explaining the savings.`;

        // Start Chat Session
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction,
                tools: [{ functionDeclarations: [searchTool, optimizeTool, dealsTool] }],
                temperature: 0.1
            }
        });

        sendEvent('status', { agent: 'Coordinator', message: 'Planning tool execution...', state: 'running' });

        let response = await chat.sendMessage({ message });
        
        // Loop to handle tool calls
        while (response.functionCalls && response.functionCalls.length > 0) {
            const toolResults = [];

            for (const call of response.functionCalls) {
                if (call.name === 'search_products') {
                    const query = call.args.query;
                    sendEvent('status', { agent: 'Search Agent', message: `Searching for: ${query}...`, state: 'running' });
                    const products = await searchProductsSkill(query, location);
                    allProducts.push(...products);
                    sendEvent('status', { agent: 'Search Agent', message: `Found ${products.length} results for ${query}.`, state: 'completed' });
                    toolResults.push({
                        functionResponse: {
                            name: call.name,
                            response: { result: `Found ${products.length} items. Added to internal state.` }
                        }
                    });
                } else if (call.name === 'optimize_basket') {
                    const targetItems = call.args.targetItems || [];
                    sendEvent('status', { agent: 'Optimizer Agent', message: 'Optimizing cart across stores...', state: 'running' });
                    const optimization = await optimizeBasketSkill(allProducts, targetItems);
                    results.optimization = optimization;
                    sendEvent('status', { agent: 'Optimizer Agent', message: 'Optimization complete.', state: 'completed' });
                    toolResults.push({
                        functionResponse: {
                            name: call.name,
                            response: { result: optimization }
                        }
                    });
                } else if (call.name === 'analyze_deals') {
                    sendEvent('status', { agent: 'Deals Agent', message: 'Analyzing deals...', state: 'running' });
                    const deals = await analyzeDealsSkill(allProducts);
                    results.deals = deals;
                    sendEvent('status', { agent: 'Deals Agent', message: `Found ${deals.length} deals.`, state: 'completed' });
                    toolResults.push({
                        functionResponse: {
                            name: call.name,
                            response: { result: deals }
                        }
                    });
                }
            }

            // Send tool responses back to the model
            sendEvent('status', { agent: 'Coordinator', message: 'Evaluating tool results...', state: 'running' });
            response = await chat.sendMessage({ 
                message: toolResults 
            });
        }

        // Final Synthesis
        sendEvent('status', { agent: 'Coordinator', message: 'Synthesizing final response...', state: 'running' });
        
        sendEvent('result', { 
            text: response.text,
            products: allProducts,
            insights: results
        });
        
    } catch (error) {
        console.error('Coordinator Agent Error:', error);
        sendEvent('status', { agent: 'Coordinator', message: `Error: ${error.message}`, state: 'failed' });
        throw error;
    }
}

module.exports = {
    handleUserRequest
};
