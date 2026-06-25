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
      className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-850 bg-zinc-900/10 backdrop-blur-md p-4 transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700/85 hover:bg-zinc-900/30 hover:shadow-[0_12px_24px_rgba(0,0,0,0.5)] group w-full" 
      data-id={product.id}
    >
      {/* Aggregated or Store Badge */}
      {offersList.length > 1 ? (
        <span className="absolute top-3 left-3 px-2.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider rounded-full bg-indigo-600 text-white z-10 shadow-md">
          ⚡ Aggregated
        </span>
      ) : (
        <span className={`absolute top-3 left-3 px-2.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider rounded-full z-10 shadow-md text-white ${
          cheapestOffer.name === 'blinkit' 
            ? 'bg-emerald-600' 
            : cheapestOffer.name === 'zepto' 
              ? 'bg-purple-600' 
              : 'bg-zinc-600'
        }`}>
          {cheapestOffer.name === 'blinkit' ? 'Blinkit' : cheapestOffer.name === 'zepto' ? 'Zepto' : cheapestOffer.name}
        </span>
      )}

      {/* Discount Badge */}
      {bestDiscount && (
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-rose-500 text-white text-[8px] font-black px-2.5 py-0.5 rounded-full shadow-md">
            {bestDiscount}
          </span>
        </div>
      )}

      {/* Image Container */}
      <div className="w-full aspect-square rounded-xl bg-white flex items-center justify-center p-3 mb-4 overflow-hidden relative shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] border border-zinc-200/80">
        <img className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]" src={imgUrl} alt={product.title} loading="lazy" />
      </div>

      <div className="flex flex-col flex-1">
        {/* Title */}
        <h3 className="text-zinc-200 font-bold text-xs leading-snug line-clamp-2 min-h-[2.5rem] mb-1 group-hover:text-white transition-colors duration-200" title={product.title}>
          {product.title}
        </h3>
        
        {/* Weight */}
        <span className="text-[10px] text-zinc-500 font-semibold tracking-wide mb-3 block">
          {product.weight || '\u00a0'}
        </span>
        
        {/* Offers list */}
        <div className="space-y-2 mt-auto">
          {offersList.map((offer, index) => (
            <div 
              key={offer.name} 
              className={`flex items-center justify-between p-2 rounded-xl border text-[11px] transition-all duration-150 ${
                index === 0 && offersList.length > 1 
                  ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.02)]' 
                  : 'bg-zinc-950/45 border-zinc-800/80 text-zinc-400'
              }`}
            >
              <div className="flex items-center">
                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                  offer.name === 'blinkit' 
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' 
                    : 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                }`}></span>
                <span className="font-black uppercase tracking-wider text-[9px]">
                  {offer.name === 'blinkit' ? 'Blinkit' : offer.name === 'zepto' ? 'Zepto' : offer.name}
                </span>
                {index === 0 && offersList.length > 1 && (
                  <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 rounded ml-1.5 tracking-wider shrink-0">
                    Cheapest
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end">
                  {offer.originalPrice && (
                    <span className="text-[9px] line-through text-zinc-650 mr-1.5 font-medium">
                      {offer.originalPrice}
                    </span>
                  )}
                  <span className={`font-black text-xs ${
                    index === 0 && offersList.length > 1 ? 'text-emerald-400' : 'text-zinc-100'
                  }`}>
                    {offer.price || 'N/A'}
                  </span>
                </div>
                {offer.delivery && (
                  <span className="text-[8px] text-zinc-550 flex items-center gap-1 justify-end font-semibold mt-0.5">
                    ⏱️ {offer.delivery}
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
