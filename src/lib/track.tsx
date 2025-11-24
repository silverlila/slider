import React from "react";
import { useSpring, animated, config } from "@react-spring/web";
import { useCarouselContext } from "./context";
import type { CarouselTrackProps } from "./types";
import "./styles.css";
import { useDrag } from "@use-gesture/react";

export const Track = React.memo(
  ({ children, className, style, ...props }: CarouselTrackProps) => {
    const { currentIndex, gap, slidesToShow, setCurrentIndex, slideCount } =
      useCarouselContext();

    const trackRef = React.useRef<HTMLDivElement>(null);
    const positionsRef = React.useRef<number[]>([]);
    const isMomentumScrolling = React.useRef(false);

    const [spring, api] = useSpring(() => ({
      x: 0,
      config: config.default,
    }));

    const calculatePositions = () => {
      if (!trackRef.current || slideCount === 0) return;

      const trackWidth = trackRef.current.offsetWidth;
      const gapPixels = gap * 16;

      const slideWidth =
        (trackWidth - gapPixels * (slidesToShow - 1)) / slidesToShow;

      positionsRef.current = [];

      for (let i = 0; i < slideCount; i++) {
        const offset = i * (slideWidth + gapPixels);
        positionsRef.current.push(-offset);
      }
    };

    React.useEffect(() => {
      calculatePositions();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gap, slidesToShow, slideCount]);

    React.useEffect(() => {
      let timeoutId: number;

      const handleResize = () => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          calculatePositions();
          const pos = positionsRef.current[currentIndex] || 0;
          api.start({ x: pos, immediate: true });
        }, 150);
      };

      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        clearTimeout(timeoutId);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex, api]);

    React.useEffect(() => {
      if (isMomentumScrolling.current) return;

      const targetPosition = positionsRef.current[currentIndex] || 0;
      api.start({ x: targetPosition, immediate: false });
    }, [currentIndex, api]);

    const bind = useDrag(
      ({ down, movement: [mx], velocity: [vx], direction: [dx] }) => {
        const currentPosition = positionsRef.current[currentIndex] || 0;

        if (down) {
          api.start({ x: currentPosition + mx, immediate: true });
        } else {
          if (slidesToShow === 1) {
            const threshold = 80;
            const velocityThreshold = 0.3;

            const isFastSwipe = Math.abs(vx) > velocityThreshold;
            const isSignificantDrag = Math.abs(mx) > threshold;

            let targetIndex = currentIndex;
            if (isFastSwipe || isSignificantDrag) {
              targetIndex =
                dx === 0
                  ? currentIndex
                  : dx > 0
                  ? Math.max(0, currentIndex - 1)
                  : Math.min(slideCount - 1, currentIndex + 1);
            }

            const targetPosition = positionsRef.current[targetIndex] || 0;
            api.start({ x: targetPosition, immediate: false });

            if (targetIndex !== currentIndex) {
              React.startTransition(() => setCurrentIndex(targetIndex));
            }
          } else {
            const momentum = vx * 0.8;
            const projectedX = spring.x.get() + mx + momentum;
            // Find closest snap point
            const closestIndex = positionsRef.current.reduce(
              (closestIdx, pos, idx, arr) => {
                const currentDistance = Math.abs(pos - projectedX);
                const closestDistance = Math.abs(arr[closestIdx] - projectedX);
                return currentDistance < closestDistance ? idx : closestIdx;
              },
              0
            );

            const targetPosition = positionsRef.current[closestIndex] || 0;

            isMomentumScrolling.current = true;

            api.start({
              x: targetPosition,
              config: config.default,
              onRest: () => {
                isMomentumScrolling.current = false;

                if (closestIndex !== currentIndex) {
                  React.startTransition(() => setCurrentIndex(closestIndex));
                }
              },
            });
          }
        }
      },
      {
        axis: "x",
        filterTaps: true,
        pointer: { touch: true },
      }
    );

    return (
      <animated.div
        ref={trackRef}
        {...bind()}
        data-glide-track
        style={{ ...style, ...spring }}
        className={className}
        aria-live="off"
        {...props}
      >
        {children}
      </animated.div>
    );
  }
);

Track.displayName = "Carousel.Track";
