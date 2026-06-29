function optimizeBasketSkill(products, targetItems) {
    if (!products || products.length === 0 || !targetItems || targetItems.length === 0) {
        return {
            bestBasket: [],
            totalCost: 0,
            reasoning: 'No products or target items provided for optimization.'
        };
    }

    // Group products by store
    const storeProducts = {
        blinkit: [],
        zepto: [],
        instamart: []
    };

    products.forEach(product => {
        if (product.providers) {
            Object.keys(product.providers).forEach(store => {
                if (storeProducts[store]) {
                    storeProducts[store].push({
                        title: product.title,
                        price: product.providers[store].rawPrice,
                        store: store
                    });
                }
            });
        }
    });

    // Find cheapest option for each target item
    const bestBasket = [];
    let totalCost = 0;

    targetItems.forEach(targetItem => {
        const targetLower = targetItem.toLowerCase();
        let bestOption = null;
        let bestPrice = Infinity;

        Object.keys(storeProducts).forEach(store => {
            const matches = storeProducts[store].filter(p => 
                p.title.toLowerCase().includes(targetLower)
            );
            
            matches.forEach(match => {
                if (match.price < bestPrice) {
                    bestPrice = match.price;
                    bestOption = { ...match, targetItem };
                }
            });
        });

        if (bestOption) {
            bestBasket.push(bestOption);
            totalCost += bestPrice;
        }
    });

    const reasoning = bestBasket.length > 0
        ? `Found ${bestBasket.length} items from ${[...new Set(bestBasket.map(b => b.store))].join(', ')} stores.`
        : 'No matching products found for the target items.';

    return {
        bestBasket,
        totalCost,
        reasoning
    };
}

module.exports = {
    optimizeBasketSkill
};
