"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface MarqueeTextProps {
  children: React.ReactNode;
  /**
   * Tailwind/CSS classes for the outer container with fixed height/width constraint
   */
  containerClassName?: string;
  /**
   * Tailwind/CSS classes for the text content
   */
  className?: string;
  /**
   * HTML tag to render for the text content (default: "span")
   */
  as?: "div" | "h1" | "h2" | "h3" | "p" | "span";
  /**
   * Gap between the looping items in pixels (default: 48)
   */
  gap?: number;
  /**
   * Scrolling speed in pixels per second (default: 32)
   */
  speed?: number;
  /**
   * Key to force reset animation when track changes
   */
  resetKey?: string | number;
}

export function MarqueeText({
  children,
  containerClassName = "",
  className = "",
  as: Component = "span",
  gap = 48,
  speed = 32,
  resetKey,
}: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [duration, setDuration] = useState(12);

  const checkOverflow = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const contentWidth = contentRef.current.scrollWidth;

    if (containerWidth === 0) return;

    if (contentWidth > containerWidth + 2) {
      setIsOverflowing(true);
      const totalDistance = contentWidth + gap;
      // 20% stationary pause at beginning, 80% smooth scroll across totalDistance
      const movingTime = totalDistance / speed;
      const totalDuration = movingTime / 0.8;
      setDuration(Math.max(6, Math.round(totalDuration * 10) / 10));
    } else {
      setIsOverflowing(false);
    }
  }, [gap, speed]);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      checkOverflow();
    });

    ro.observe(container);
    if (content) {
      ro.observe(content);
    }

    const handleResize = () => {
      checkOverflow();
    };
    window.addEventListener("resize", handleResize);

    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(checkOverflow);
    }

    const raf = requestAnimationFrame(() => {
      checkOverflow();
    });

    const timer1 = setTimeout(checkOverflow, 150);
    const timer2 = setTimeout(checkOverflow, 500);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(raf);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [checkOverflow, resetKey, children]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-w-0 max-w-full overflow-hidden ${containerClassName}`}
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        contain: "paint inline-size",
        ...(isOverflowing
          ? {

            WebkitMaskImage:
              "linear-gradient(to right, black calc(100% - 24px), transparent 100%)",
          }
          : {}),
      }}
    >
      <div
        key={resetKey}
        className={`flex items-center ${isOverflowing
          ? "w-max will-change-transform animate-marquee hover:[animation-play-state:paused]"
          : "w-full min-w-0"
          }`}
        style={
          isOverflowing
            ? { ["--marquee-duration" as string]: `${duration}s` }
            : undefined
        }
      >
        <div
          className="flex shrink-0 items-center"
          style={{ marginRight: isOverflowing ? `${gap}px` : undefined }}
        >
          <Component
            ref={contentRef as any}
            className={`whitespace-nowrap ${className}`}
          >
            {children}
          </Component>
        </div>
        {isOverflowing && (
          <div
            className="flex shrink-0 items-center"
            style={{ marginRight: `${gap}px` }}
            aria-hidden="true"
          >
            <Component className={`whitespace-nowrap ${className}`}>
              {children}
            </Component>
          </div>
        )}
      </div>
    </div>
  );
}
