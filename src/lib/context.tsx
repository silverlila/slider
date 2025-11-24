import React from "react";
import type { CarouselContextValue } from "./types";

export const CarouselContext = React.createContext<
  CarouselContextValue | undefined
>(undefined);

export const useCarouselContext = (): CarouselContextValue => {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error(
      "Carousel compound components must be used within a <Carousel> component"
    );
  }
  return context;
};
