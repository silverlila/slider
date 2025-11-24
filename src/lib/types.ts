import type React from "react";

export interface CarouselContextValue {
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  prev: () => void;
  next: () => void;
  goTo: (index: number) => void;
  slidesToShow: number;
  slideCount: number;
  gap: number;
  registerSlide: (id: string) => void;
  unregisterSlide: (id: string) => void;
}

export interface CarouselProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  children: React.ReactNode;
  slidesToShow?: number;
  gap?: number;
  defaultIndex?: number;
  currentIndex?: number;
  onSlideChange?: (currentIndex: number, previousIndex: number) => void;
}

export interface CarouselTrackProps extends React.ComponentProps<"div"> {
  /** Slide components */
  children: React.ReactNode;
}

export interface CarouselSlideProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
}

export interface CarouselPrevButtonProps
  extends React.ComponentProps<"button"> {
  children?: React.ReactNode;
}

export interface CarouselNextButtonProps
  extends React.ComponentProps<"button"> {
  children?: React.ReactNode;
}

export type DynamicStyles = React.CSSProperties & {
  "--slides-to-show": number;
  "--carousel-gap": number;
};
