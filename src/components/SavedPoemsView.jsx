import { X, Heart } from 'lucide-react';
import { DESIGN } from '../constants/design';
import { GOLD } from '../constants/theme';

const SavedPoemsView = ({
  isOpen,
  onClose,
  savedPoems,
  onSelectPoem,
  onUnsavePoem,
  theme,
  currentFontClass,
}) => {
  if (!isOpen) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col ${theme.glass} ${theme.border} border ${DESIGN.radius} shadow-2xl`}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-stone-500/10 flex-shrink-0">
          <div>
            <h2 className={`font-amiri text-2xl ${theme.titleColor}`}>قصائدي المحفوظة</h2>
            <p className={`font-brand-en text-xs ${theme.text} opacity-50 mt-1`}>
              My Saved Poems ({savedPoems.length})
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={20} className={theme.text} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {savedPoems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Heart size={48} className={`${theme.text} opacity-20`} />
              <div className="text-center">
                <p className={`font-amiri text-xl ${theme.text} opacity-40`}>
                  لا توجد قصائد محفوظة
                </p>
                <p className={`font-brand-en text-sm ${theme.text} opacity-30 mt-1`}>
                  No saved poems yet
                </p>
                <p className={`font-brand-en text-xs ${theme.text} opacity-20 mt-3`}>
                  Tap the heart icon on any poem to save it
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPoems.map((sp) => (
                <div
                  key={sp.id}
                  className={`group ${theme.glass} ${theme.border} border ${DESIGN.radius} p-4 transition-all ${GOLD.goldHoverBorderSubtle}`}
                >
                  <button
                    onClick={() => onSelectPoem(sp)}
                    className="w-full text-left cursor-pointer bg-transparent border-none p-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`font-amiri text-sm ${theme.titleColor} font-medium`}>
                          {sp.poet || 'Unknown'}
                        </p>
                        <p className={`font-brand-en text-xs ${theme.text} opacity-50 mt-0.5`}>
                          {sp.title || ''}
                        </p>
                        <p
                          className={`${currentFontClass} text-sm ${theme.text} opacity-70 mt-2 line-clamp-2`}
                          dir="rtl"
                        >
                          {(sp.poem_text || '').slice(0, 80)}
                          {(sp.poem_text || '').length > 80 ? '...' : ''}
                        </p>
                      </div>
                    </div>
                    {sp.saved_at && (
                      <p className={`font-brand-en text-[10px] ${theme.text} opacity-30 mt-2`}>
                        {formatDate(sp.saved_at)}
                      </p>
                    )}
                  </button>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => onUnsavePoem(sp)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-red-500/10 transition-colors"
                      aria-label="Remove from saved"
                    >
                      <Heart size={16} className="fill-red-500 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { SavedPoemsView };
