import { ThumbsDown } from 'lucide-react';
import { GOLD } from '../../constants/theme.js';

const DownvoteButton = ({ poem, isDownvoted, onDownvote, onUndownvote, disabled, onSignIn }) => {
  const handleClick = () => {
    if (disabled && onSignIn) {
      onSignIn('Sign in to flag poems');
      return;
    }
    if (disabled) return;

    if (isDownvoted) {
      onUndownvote();
    } else {
      onDownvote();
    }
  };

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[52px]">
      <button
        onClick={handleClick}
        className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
        aria-label={isDownvoted ? 'Unflag poem' : 'Flag poem'}
      >
        <ThumbsDown
          size={21}
          className={`${isDownvoted ? 'fill-red-400 text-red-400' : GOLD.goldText} transition-all`}
        />
      </button>
      <span
        className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
      >
        {isDownvoted ? 'Flagged' : 'Flag'}
      </span>
    </div>
  );
};

export default DownvoteButton;
