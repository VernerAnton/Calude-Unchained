import { modelOptions, type ModelValue } from "@shared/schema";

interface ModelSelectorProps {
  value: ModelValue;
  onChange: (value: ModelValue) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <label 
        htmlFor="model-select" 
        className="hidden sm:inline text-sm font-bold tracking-[0.1em]"
      >
        [ MODEL ]
      </label>
      <select
        id="model-select"
        value={value}
        onChange={(e) => onChange(e.target.value as ModelValue)}
        className="bg-card text-card-foreground border-2 border-border font-mono text-sm uppercase px-3 py-2 cursor-pointer transition-all hover-elevate shadow-md"
        style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}
        data-testid="select-model"
      >
        {modelOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
