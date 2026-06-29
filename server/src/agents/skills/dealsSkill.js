function analyzeDealsSkill(products) {
    if (!products || products.length === 0) {
        return [];
    }

    const deals = [];

    products.forEach(product => {
        if (product.providers) {
            const stores = Object.keys(product.providers);
            
            if (stores.length >= 2) {
                // Compare prices across stores
                let cheapestStore = null;
                let cheapestPrice = Infinity;
                let priceDifference = 0;

                stores.forEach(store => {
                    const price = product.providers[store].rawPrice;
                    if (price < cheapestPrice) {
                        cheapestPrice = price;
                        cheapestStore = store;
                    }
                });

                // Find most expensive for comparison
                let mostExpensivePrice = 0;
                stores.forEach(store => {
                    const price = product.providers[store].rawPrice;
                    if (price > mostExpensivePrice) {
                        mostExpensivePrice = price;
                    }
                });

                priceDifference = mostExpensivePrice - cheapestPrice;

                // Only include if there's a meaningful price difference (> 5%)
                if (priceDifference > 0 && (priceDifference / mostExpensivePrice) > 0.05) {
                    const savingsPercent = Math.round((priceDifference / mostExpensivePrice) * 100);
                    
                    deals.push({
                        name: product.title,
                        store: cheapestStore,
                        originalPrice: mostExpensivePrice,
                        dealPrice: cheapestPrice,
                        savings: priceDifference,
                        savingsPercent: savingsPercent,
                        reason: `${savingsPercent}% cheaper than other stores`
                    });
                }
            }

            // Check for discounts
            stores.forEach(store => {
                const provider = product.providers[store];
                if (provider.discount && provider.discount > 0) {
                    deals.push({
                        name: product.title,
                        store: store,
                        originalPrice: provider.originalPrice || provider.rawPrice,
                        dealPrice: provider.rawPrice,
                        savings: provider.discount,
                        savingsPercent: Math.round((provider.discount / (provider.originalPrice || provider.rawPrice)) * 100),
                        reason: `${Math.round((provider.discount / (provider.originalPrice || provider.rawPrice)) * 100)}% discount on ${store}`
                    });
                }
            });
        }
    });

    // Sort by savings percentage (highest first)
    deals.sort((a, b) => b.savingsPercent - a.savingsPercent);

    // Return top 10 deals
    return deals.slice(0, 10);
}

module.exports = {
    analyzeDealsSkill
};
