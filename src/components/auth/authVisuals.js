export const AUTH_TESS_BG = [
  'repeating-linear-gradient(45deg, rgba(197,160,89,0.18) 0px, rgba(197,160,89,0.18) 1px, transparent 1px, transparent 22px)',
  'repeating-linear-gradient(-45deg, rgba(197,160,89,0.18) 0px, rgba(197,160,89,0.18) 1px, transparent 1px, transparent 22px)',
  'repeating-linear-gradient(0deg, rgba(197,160,89,0.09) 0px, rgba(197,160,89,0.09) 1px, transparent 1px, transparent 22px)',
  'repeating-linear-gradient(90deg, rgba(197,160,89,0.09) 0px, rgba(197,160,89,0.09) 1px, transparent 1px, transparent 22px)',
  'repeating-linear-gradient(22.5deg, rgba(197,160,89,0.07) 0px, rgba(197,160,89,0.07) 1px, transparent 1px, transparent 44px)',
  'repeating-linear-gradient(-22.5deg, rgba(197,160,89,0.07) 0px, rgba(197,160,89,0.07) 1px, transparent 1px, transparent 44px)',
].join(', ');

export const AUTH_BACKDROP_STYLE = {
  background: 'rgba(0,0,0,0.65)',
  backdropFilter: 'blur(2px)',
};

export const AUTH_PANEL_STYLE = {
  background: 'linear-gradient(180deg, rgba(14,12,10,0.98), rgba(10,10,14,0.99))',
  boxShadow:
    '0 0 0 1px rgba(197,160,89,0.15), 0 32px 80px rgba(0,0,0,0.8), 0 8px 24px rgba(0,0,0,0.5)',
};

export const AUTH_HEADER_STYLE = {
  background: 'linear-gradient(180deg, rgba(20,16,10,0.98), rgba(14,12,10,0.97))',
};

export const AUTH_HAIRLINE_STYLE = {
  height: '2px',
  zIndex: 2,
  background:
    'linear-gradient(90deg, transparent, rgba(160,128,64,0.4) 20%, #c5a059 50%, rgba(160,128,64,0.4) 80%, transparent)',
};
