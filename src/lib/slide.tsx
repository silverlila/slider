import React, { useEffect, useId } from "react";
import { useCarouselContext } from "./context";
import type { CarouselSlideProps } from "./types";
import "./styles.css";

export const Slide = React.memo(
  ({ children, className, ...props }: CarouselSlideProps) => {
    const slideId = useId();
    const { registerSlide, unregisterSlide } = useCarouselContext();

    useEffect(() => {
      registerSlide(slideId);

      return () => {
        unregisterSlide(slideId);
      };
    }, [slideId, registerSlide, unregisterSlide]);

    return (
      <div
        data-glide-slide
        className={className}
        role="group"
        aria-roledescription="slide"
        {...props}
      >
        {children}
      </div>
    );
  }
);

Slide.displayName = "Carousel.Slide";
