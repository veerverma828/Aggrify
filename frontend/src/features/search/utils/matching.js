import { BRANDS } from '../constants/searchConstants';

export const getBrand = (title) => {
  const t = (title || '').toLowerCase();
  for (const b of BRANDS) {
    if (t.includes(b.replace(/['’]/g, '')) || t.includes(b)) {
      return b.replace(/['’]/g, '');
    }
  }
  return t.split(/\s+/)[0] || '';
};

export const parseWeightVal = (weightStr) => {
  if (!weightStr) return null;
  let str = weightStr.toLowerCase().replace(/\s+/g, '');
  
  str = str
    .replace(/grams?/g, 'g')
    .replace(/litres?/g, 'l')
    .replace(/millilitres?/g, 'ml')
    .replace(/kilograms?/g, 'kg');
    
  const massVolMatches = [...str.matchAll(/(\d+(?:\.\d+)?)(g|kg|ml|l)\b/g)];
  if (massVolMatches.length > 0) {
    const last = massVolMatches[massVolMatches.length - 1];
    return { val: parseFloat(last[1]), unit: last[2] };
  }
  
  const countMatches = [...str.matchAll(/(\d+(?:\.\d+)?)(pcs|pc|units?|packs?)/g)];
  if (countMatches.length > 0) {
    return { val: parseFloat(countMatches[0][1]), unit: countMatches[0][2] };
  }
  
  return null;
};

export const getCleanWords = (title) => {
  const fillerWords = new Set([
    'flavour', 'flavor', 'style', 'original', 'taste', 'crunchy', 'crispy', 'crispz',
    'fresh', 'premium', 'gourmet', 'natural', 'pure', 'selected', 'quality',
    'best', 'super', 'real', 'delicious', 'mouthwatering', 'pack', 'packet', 'packs',
    'potato', 'chips', 'wafer', 'wafers', 'and', 'with', 'for', 'of', 'or', 'in'
  ]);
  
  return (title || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .map(w => {
      if (w === 'limon') return 'lemon';
      if (w === 'chilli') return 'chili';
      if (w === 'lite') return 'light';
      return w;
    })
    .filter(w => w && !fillerWords.has(w));
};

export const areProductsSame = (p1, p2) => {
  const brand1 = getBrand(p1.title);
  const brand2 = getBrand(p2.title);
  if (brand1 !== brand2) return false;

  const w1 = parseWeightVal(p1.weight);
  const w2 = parseWeightVal(p2.weight);
  if (w1 && w2) {
    if (w1.unit !== w2.unit) return false;
    const ratio = w1.val / w2.val;
    if (ratio < 0.8 || ratio > 1.25) return false;
  } else if ((p1.weight && !p2.weight) || (!p1.weight && p2.weight)) {
    return false;
  }

  const words1 = getCleanWords(p1.title);
  const words2 = getCleanWords(p2.title);
  
  if (words1.length === 0 || words2.length === 0) return false;
  
  const intersection = words1.filter(w => words2.includes(w));
  const overlapRatio = intersection.length / Math.min(words1.length, words2.length);
  
  return overlapRatio >= 0.7;
};

export const getMatchKey = (title, weight) => {
  const normTitle = (title || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
  const normWeight = (weight || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/grams?/g, 'g')
    .replace(/litres?/g, 'l')
    .replace(/millilitres?/g, 'ml')
    .replace(/kilograms?/g, 'kg');
  return `${normTitle}|${normWeight}`;
};

export const parsePrice = (priceStr) => {
  if (!priceStr) return Infinity;
  const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? Infinity : num;
};
