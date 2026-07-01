const { getCachedProducts, setCachedProducts } = require('../../features/search/services/cache');
const { scrapeBlinkit } = require('../../features/search/scrapers/blinkitScraper');
const { scrapeZepto } = require('../../features/search/scrapers/zeptoScraper');
const { scrapeInstamart } = require('../../features/search/scrapers/instamartScraper');
const { LOCATIONS, DEFAULT_LOCATION } = require('../../features/search/constants/locations');

async function searchProductsSkill(query, locationParam = 'meerut') {
    const source = 'all';
    const locationKey = locationParam.toLowerCase().trim();
    const locationInfo = LOCATIONS[locationKey] || DEFAULT_LOCATION;
    const supportedStores = locationInfo.supportedStores || ['blinkit', 'zepto', 'instamart'];

    const cachedProducts = getCachedProducts(query, source, locationInfo.id);
    if (cachedProducts) {
        return cachedProducts;
    }

    const accumulated = [];
    const isCancelled = () => false;
    const onProducts = (newProducts) => {
        accumulated.push(...newProducts);
    };

    const scrapers = [];
    if (supportedStores.includes('blinkit')) {
        scrapers.push(scrapeBlinkit(query, locationInfo, onProducts, isCancelled).catch(e => console.error(e)));
    }
    if (supportedStores.includes('zepto')) {
        scrapers.push(scrapeZepto(query, locationInfo, onProducts, isCancelled).catch(e => console.error(e)));
    }
    if (supportedStores.includes('instamart')) {
        scrapers.push(scrapeInstamart(query, locationInfo, onProducts, isCancelled).catch(e => console.error(e)));
    }

    await Promise.all(scrapers);

    if (accumulated.length > 0) {
        setCachedProducts(query, source, locationInfo.id, accumulated);
    }

    return accumulated;
}

module.exports = {
    searchProductsSkill
};
