import { useState, useEffect, useRef } from "react";

interface UseTypewriterOptions {
  text: string;
  speed?: number; // milliseconds per character
  enabled?: boolean;
}

export function useTypewriter({ text, speed = 30, enabled = true }: UseTypewriterOptions) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const currentIndexRef = useRef(0);
  const targetTextRef = useRef(text);

  // Update target text when it changes
  useEffect(() => {
    targetTextRef.current = text;

    // If text was cleared/reset (became shorter than what we're displaying), reset
    if (text.length < currentIndexRef.current) {
      currentIndexRef.current = 0;
      setDisplayedText("");
    }
  }, [text]);

  // Main typing effect
  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    const timer = setInterval(() => {
      const targetText = targetTextRef.current;

      if (currentIndexRef.current < targetText.length) {
        setIsTyping(true);
        currentIndexRef.current += 1;
        setDisplayedText(targetText.slice(0, currentIndexRef.current));
      } else {
        setIsTyping(false);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [speed, enabled]);

  return { displayedText, isTyping };
}
