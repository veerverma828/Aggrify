import React, { memo } from 'react';
import { parsePrice } from '../utils/matching';

const ProductCard = memo(function ProductCard({ product }) {
  const imgUrl = product.image || 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?w=300&auto=format&fit=crop&q=60';
  
  const providers = product.providers || {
    [product.provider || 'unknown']: {
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      delivery: product.delivery,
      rawPrice: parsePrice(product.price)
    }
  };

  const offersList = Object.entries(providers).map(([name, info]) => ({
    name,
    ...info
  }));

  // Sort offers cheapest first
  offersList.sort((a, b) => a.rawPrice - b.rawPrice);

  const cheapestOffer = offersList[0] || {};
  const bestDiscount = (offersList.find(o => o.discount) || {}).discount;

  return (
    <div 
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white/[0.02] border border-white/10 p-3 transition-all duration-300 hover:bg-white/[0.04] hover:-translate-y-1 hover:border-white/20 w-full"
      data-id={product.id}
    >
      {/* Badges Container */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10 pointer-events-none">
        {offersList.length > 1 ? (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white border border-blue-500 shadow-md">
            Aggregated
          </span>
        ) : (
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shadow-sm border ${
            cheapestOffer.name === 'blinkit' 
              ? 'bg-yellow-400 text-black border-yellow-300' 
              : cheapestOffer.name === 'zepto' 
                ? 'bg-purple-600 text-white border-purple-500' 
                : 'bg-white/10 text-white border-white/20'
          }`}>
            {cheapestOffer.name === 'blinkit' ? 'Blinkit' : cheapestOffer.name === 'zepto' ? 'Zepto' : cheapestOffer.name}
          </span>
        )}

        {bestDiscount && (
          <span className="bg-rose-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md">
            {bestDiscount}
          </span>
        )}
      </div>

      {/* Image Container */}
      <div className="w-full aspect-square rounded-xl bg-white flex items-center justify-center p-4 mb-4 overflow-hidden relative">
        <img 
          className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105" 
          src={imgUrl} 
          alt={product.title} 
          loading="lazy" 
        />
      </div>

      <div className="flex flex-col flex-1">
        {/* Title */}
        <h3 className="text-white font-medium text-sm leading-tight mb-1" title={product.title}>
          {product.title}
        </h3>
        
        {/* Weight */}
        <span className="text-[11px] text-ink-muted font-normal tracking-wide mb-4 block">
          {product.weight || '\u00a0'}
        </span>
        
        {/* Offers list */}
        <div className="space-y-1.5 mt-auto">
          {offersList.map((offer, index) => (
            <div 
              key={offer.name} 
              className={`flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 border ${
                index === 0 && offersList.length > 1 
                  ? 'bg-emerald-500/5 border-emerald-500/20' 
                  : 'bg-white/5 border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  offer.name === 'blinkit' 
                    ? 'bg-yellow-400' 
                    : offer.name === 'zepto'
                      ? 'bg-purple-500'
                      : 'bg-orange-500'
                }`}></span>
                <span className="font-medium text-xs text-white capitalize">
                  {offer.name}
                </span>
                {index === 0 && offersList.length > 1 && (
                  <span className="text-[9px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded ml-1">
                    Best
                  </span>
                )}
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  {offer.originalPrice && (
                    <span className="text-[10px] line-through text-ink-muted">
                      {offer.originalPrice}
                    </span>
                  )}
                  <span className={`font-semibold text-sm ${
                    index === 0 && offersList.length > 1 ? 'text-emerald-400' : 'text-white'
                  }`}>
                    {offer.price || 'N/A'}
                  </span>
                </div>
                {offer.delivery && (
                  <span className="text-[9px] text-ink-muted flex items-center gap-1 mt-0.5">
                    {offer.delivery}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
