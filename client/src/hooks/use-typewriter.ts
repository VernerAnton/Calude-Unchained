import { useState, useEffect, useRef } from "react";

interface UseTypewriterOptions {
  text: string;
  speed?: number; // milliseconds per character
  enabled?: boolean;
}

export function useTypewriter({ text, speed = 30, enabled = true }: UseTypewriterOptions) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // If text got shorter (e.g., reset), reset the index
    if (text.length < indexRef.current) {
      indexRef.current = 0;
      setDisplayedText("");
    }

    // If we're already showing all the text, no need to type
    if (indexRef.current >= text.length) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);

    const timer = setInterval(() => {
      if (indexRef.current < text.length) {
        indexRef.current += 1;
        setDisplayedText(text.slice(0, indexRef.current));
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, enabled]);

  return { displayedText, isTyping };
}
