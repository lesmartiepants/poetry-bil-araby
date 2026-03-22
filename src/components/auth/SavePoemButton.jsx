import { Heart } from 'lucide-react';
import { GOLD } from '../../constants/theme.js';

const SavePoemButton = ({ poem, isSaved, onSave, onUnsave, disabled, onSignIn }) => {
  const handleClick = () => {
    if (disabled && onSignIn) {
      onSignIn('Sign in to save your favourites');
      return;
    }
    if (disabled) return;

    if (isSaved) {
      onUnsave();
    } else {
      onSave();
    }
  };

  return (
    <div className="relative flex flex-col items-center gap-0.5 min-w-[52px]">
      <button
        onClick={handleClick}
        className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
        aria-label={isSaved ? 'Unsave poem' : 'Save poem'}
      >
        <Heart
          size={21}
          className={`${isSaved ? 'fill-red-500 text-red-500' : GOLD.goldText} transition-all`}
        />
      </button>
      <span
        className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
      >
        {isSaved ? 'Saved' : 'Save'}
      </span>
    </div>
  );
};

export default SavePoemButton;
