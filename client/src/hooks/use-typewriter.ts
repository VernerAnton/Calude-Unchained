import { useState, useEffect, useRef } from "react";

interface UseTypewriterOptions {
  text: string;
  speed?: number; // milliseconds per character
  enabled?: boolean;
}

export function useTypewriter({ text, speed = 20, enabled = true }: UseTypewriterOptions) {
  const = useState("");
  const = useState(false);
  
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);
  const currentIndexRef = useRef(0);
  const targetTextRef = useRef(text);

  // Update target text when it changes
  useEffect(() => {
    targetTextRef.current = text;

    // If text was cleared/reset (became shorter than what we're displaying), reset
    if (text.length < currentIndexRef.current) {
      currentIndexRef.current = 0;
      setDisplayedText("");
      lastUpdateRef.current = 0;
    }
  }, [text]);

  // Main typing effect using requestAnimationFrame for smooth animation
  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) {
        lastUpdateRef.current = timestamp;
      }

      const elapsed = timestamp - lastUpdateRef.current;
      const targetText = targetTextRef.current;

      if (elapsed >= speed) {
        if (currentIndexRef.current < targetText.length) {
          currentIndexRef.current += 1;
          setDisplayedText(targetText.slice(0, currentIndexRef.current));
          setIsTyping(true);
          lastUpdateRef.current = timestamp;
        } else {
          setIsTyping(false);
        }
      }

      if (currentIndexRef.current < targetText.length) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [text, speed, enabled]);

  return { displayedText, isTyping };
}