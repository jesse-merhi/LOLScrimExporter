import * as React from "react";

interface InfiniteScrollProps {
  isLoading: boolean;
  hasMore: boolean;
  next: () => unknown;
  threshold?: number;
  /**
   * If provided, the next() call will only fire if the target element is
   * within this many pixels from the bottom of the viewport.
   */
  stopDistance?: number;
  root?: Element | Document | null;
  rootMargin?: string;
  reverse?: boolean;
  children?: React.ReactNode;
}

export default function InfiniteScroll({
  isLoading,
  hasMore,
  next,
  threshold = 1,
  stopDistance,
  root = null,
  rootMargin = "0px",
  reverse,
  children,
}: InfiniteScrollProps) {
  const observer = React.useRef<IntersectionObserver>();

  const observerRef = React.useCallback(
    (element: HTMLElement | null) => {
      let safeThreshold = threshold;
      if (threshold < 0 || threshold > 1) {
        console.warn(
          "threshold should be between 0 and 1. Using default value: 1"
        );
        safeThreshold = 1;
      }
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();
      if (!element) return;

      observer.current = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && hasMore) {
            if (stopDistance !== undefined) {
              // Calculate the distance from the target element's bottom to the viewport's bottom
              const distanceFromBottom =
                entry.boundingClientRect.bottom - window.innerHeight;
              // Only trigger next() if within the specified stopDistance
              if (distanceFromBottom <= stopDistance) {
                next();
              }
            } else {
              next();
            }
          }
        },
        { threshold: safeThreshold, root, rootMargin }
      );
      observer.current.observe(element);
    },
    [hasMore, isLoading, next, threshold, root, rootMargin, stopDistance]
  );

  const flattenChildren = React.useMemo(
    () => React.Children.toArray(children),
    [children]
  );

  return (
    <>
      {flattenChildren.map((child, index) => {
        if (!React.isValidElement(child)) {
          process.env.NODE_ENV === "development" &&
            console.warn("You should use a valid element with InfiniteScroll");
          return child;
        }
        const isObserveTarget = reverse
          ? index === 0
          : index === flattenChildren.length - 1;
        const ref = isObserveTarget ? observerRef : null;
        return React.cloneElement(child as React.ReactElement<any>, { ref });
      })}
    </>
  );
}
