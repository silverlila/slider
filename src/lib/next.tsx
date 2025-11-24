import React from "react";
import { useCarouselContext } from "./context";
import type { CarouselNextButtonProps } from "./types";

export const NextButton = React.memo(
  ({ children = "Next", onClick, ...props }: CarouselNextButtonProps) => {
    const { next, currentIndex, slideCount } = useCarouselContext();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      next();
      onClick?.(e);
    };

    const isDisabled = currentIndex === slideCount - 1;

    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        aria-label="Next slide"
        aria-disabled={isDisabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

NextButton.displayName = "Carousel.NextButton";
