import React from "react";
import { useCarouselContext } from "./context";
import type { CarouselPrevButtonProps } from "./types";

export const PrevButton = React.memo(
  ({ children = "Previous", onClick, ...props }: CarouselPrevButtonProps) => {
    const { prev, currentIndex } = useCarouselContext();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      prev();
      onClick?.(e);
    };

    const isDisabled = currentIndex === 0;

    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        aria-label="Previous slide"
        aria-disabled={isDisabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

PrevButton.displayName = "Carousel.PrevButton";
