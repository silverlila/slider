import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { CarouselContext } from "./context";
import type { CarouselProps, DynamicStyles } from "./types";
import { useControllableState } from "./use-controlled-state";
import "./styles.css";

export const Carousel = ({
  children,
  slidesToShow = 1,
  gap = 1,
  defaultIndex = 0,
  currentIndex: controlledIndex,
  onSlideChange,
  style,
  className,
  ...props
}: CarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  const [currentIndexRaw, setCurrentIndexRaw] = useControllableState<number>({
    prop: controlledIndex,
    defaultProp: defaultIndex,
    onChange: (newIndex) => {
      if (
        onSlideChange &&
        newIndex !== undefined &&
        controlledIndex !== undefined
      ) {
        onSlideChange(newIndex, controlledIndex);
      }
    },
  });

  const currentIndex = currentIndexRaw ?? 0;

  const slideIdsRef = React.useRef<Set<string>>(new Set());
  const [slideCount, setSlideCount] = useState(0);

  const registerSlide = useCallback((id: string) => {
    const prevSize = slideIdsRef.current.size;
    slideIdsRef.current.add(id);
    if (slideIdsRef.current.size !== prevSize) {
      setSlideCount(slideIdsRef.current.size);
    }
  }, []);

  const unregisterSlide = useCallback((id: string) => {
    const prevSize = slideIdsRef.current.size;
    slideIdsRef.current.delete(id);
    if (slideIdsRef.current.size !== prevSize) {
      setSlideCount(slideIdsRef.current.size);
    }
  }, []);

  const setCurrentIndex = useCallback(
    (indexOrUpdater: React.SetStateAction<number>) => {
      setCurrentIndexRaw((prev) => {
        const prevValue = prev ?? 0;
        const newIndex =
          typeof indexOrUpdater === "function"
            ? indexOrUpdater(prevValue)
            : indexOrUpdater;

        return Math.max(0, Math.min(newIndex, slideCount - 1));
      });
    },
    [setCurrentIndexRaw, slideCount]
  );

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slideCount);
  }, [slideCount, setCurrentIndex]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? slideCount - 1 : prev - 1));
  }, [slideCount, setCurrentIndex]);

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(index);
    },
    [setCurrentIndex]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (document.activeElement !== carouselRef.current) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          prev();
          break;
        case "ArrowRight":
          e.preventDefault();
          next();
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(slideCount - 1);
          break;
      }
    },
    [prev, next, goTo, slideCount]
  );

  useEffect(() => {
    const element = carouselRef.current;
    if (!element) return;

    element.addEventListener("keydown", handleKeyDown);
    return () => element.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const contextValue = useMemo(
    () => ({
      currentIndex,
      setCurrentIndex,
      prev,
      next,
      goTo,
      slidesToShow,
      slideCount,
      gap,
      registerSlide,
      unregisterSlide,
    }),
    [
      currentIndex,
      setCurrentIndex,
      prev,
      next,
      goTo,
      slidesToShow,
      slideCount,
      gap,
      registerSlide,
      unregisterSlide,
    ]
  );

  const dynamicStyles: DynamicStyles = {
    "--slides-to-show": slidesToShow,
    "--carousel-gap": gap,
    ...style,
  };

  return (
    <CarouselContext.Provider value={contextValue}>
      <div
        ref={carouselRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={props["aria-label"] || "Carousel"}
        aria-live="polite"
        aria-atomic="false"
        data-glide
        className={className}
        style={dynamicStyles}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
};

import { Track } from "./track";
import { Slide } from "./slide";
import { PrevButton } from "./prev";
import { NextButton } from "./next";

Carousel.Track = Track;
Carousel.Slide = Slide;
Carousel.PrevButton = PrevButton;
Carousel.NextButton = NextButton;
