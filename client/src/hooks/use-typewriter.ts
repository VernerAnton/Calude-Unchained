import { useState, useEffect, useRef } from "react";

interface UseTypewriterOptions {
  text: string;
  speed?: number; // milliseconds per character
  enabled?: boolean;
}

export function useTypewriter({ text, speed = 20, enabled = true }: UseTypewriterOptions) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // Reset if text becomes shorter (new conversation)
    if (text.length < currentIndexRef.current) {
      currentIndexRef.current = 0;
      setDisplayedText("");
      lastUpdateRef.current = 0;
    }

    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) {
        lastUpdateRef.current = timestamp;
      }

      const elapsed = timestamp - lastUpdateRef.current;

      if (elapsed >= speed) {
        if (currentIndexRef.current < text.length) {
          currentIndexRef.current += 1;
          setDisplayedText(text.slice(0, currentIndexRef.current));
          setIsTyping(true);
          lastUpdateRef.current = timestamp;
        } else {
          setIsTyping(false);
        }
      }

      if (currentIndexRef.current < text.length) {
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
