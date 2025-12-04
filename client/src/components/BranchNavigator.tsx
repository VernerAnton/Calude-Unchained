import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BranchNavigatorProps {
  currentIndex: number;
  totalCount: number;
  onNavigate: (direction: "prev" | "next") => void;
}

export function BranchNavigator({ 
  currentIndex, 
  totalCount, 
  onNavigate 
}: BranchNavigatorProps) {
  if (totalCount <= 1) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Button
        size="icon"
        variant="ghost"
        className="h-5 w-5"
        onClick={() => onNavigate("prev")}
        disabled={currentIndex === 0}
        data-testid="button-branch-prev"
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
      <span className="min-w-[3ch] text-center font-mono" data-testid="text-branch-index">
        {currentIndex + 1}/{totalCount}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-5 w-5"
        onClick={() => onNavigate("next")}
        disabled={currentIndex === totalCount - 1}
        data-testid="button-branch-next"
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
