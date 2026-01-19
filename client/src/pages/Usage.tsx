import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BarChart3, ChevronLeft, TrendingUp, Calendar, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { modelOptions } from "@shared/schema";

interface UsageSummary {
  today: number;
  thisMonth: number;
  last7Days: number;
  projectedMonthEnd: number;
  monthlyBudget: number | null;
  currency: string;
  warnAt80: boolean;
  hardStopAt100: boolean;
}

interface DailyUsage {
  date: string;
  cost: number;
}

interface ModelUsage {
  model: string;
  cost: number;
}

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

function getModelLabel(modelValue: string): string {
  const model = modelOptions.find((m) => m.value === modelValue);
  return model?.label || modelValue;
}

export default function UsagePage() {
  const [, navigate] = useLocation();

  const { data: summary, isLoading: summaryLoading } = useQuery<UsageSummary>({
    queryKey: ["/api/usage/summary"],
  });

  const { data: dailyUsage, isLoading: dailyLoading } = useQuery<DailyUsage[]>({
    queryKey: ["/api/usage/daily"],
  });

  const { data: modelUsage } = useQuery<ModelUsage[]>({
    queryKey: ["/api/usage/by-model"],
  });

  const currency = summary?.currency || "USD";
  const budgetPercent = summary?.monthlyBudget 
    ? (summary.thisMonth / summary.monthlyBudget) * 100 
    : 0;
  const isOverBudget = budgetPercent >= 100;
  const isWarning = budgetPercent >= 80 && budgetPercent < 100;

  const maxDailyCost = dailyUsage?.length 
    ? Math.max(...dailyUsage.map(d => d.cost), 0.001) 
    : 0.001;

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="font-mono text-muted-foreground uppercase tracking-wider">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b-2 border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          data-testid="button-back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6" />
          <h1 className="font-mono text-2xl uppercase tracking-wider font-bold">Usage</h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-2 border-border p-4" style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Today</span>
                </div>
                <div className="font-mono text-2xl font-bold" data-testid="text-today-cost">
                  {formatCurrency(summary?.today || 0, currency)}
                </div>
              </div>

              <div className="border-2 border-border p-4" style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">This Month</span>
                </div>
                <div className="font-mono text-2xl font-bold" data-testid="text-month-cost">
                  {formatCurrency(summary?.thisMonth || 0, currency)}
                </div>
                {summary?.monthlyBudget && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs font-mono text-muted-foreground mb-1">
                      <span>{budgetPercent.toFixed(1)}%</span>
                      <span>of {formatCurrency(summary.monthlyBudget, currency)}</span>
                    </div>
                    <div className="h-2 bg-muted border border-border">
                      <div 
                        className={`h-full transition-all ${isOverBudget ? 'bg-destructive' : isWarning ? 'bg-yellow-500' : 'bg-foreground'}`}
                        style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-2 border-border p-4" style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Projected Month-End</span>
                </div>
                <div className="font-mono text-2xl font-bold" data-testid="text-projected-cost">
                  {formatCurrency(summary?.projectedMonthEnd || 0, currency)}
                </div>
                {summary?.monthlyBudget && summary.projectedMonthEnd > summary.monthlyBudget && (
                  <div className="flex items-center gap-1 mt-2 text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="font-mono text-xs uppercase">Over budget</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-2 border-border p-6" style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}>
              <h2 className="font-mono text-sm uppercase tracking-wider font-bold mb-4 text-muted-foreground">
                [ Last 30 Days ]
              </h2>
              {dailyLoading ? (
                <div className="h-32 flex items-center justify-center">
                  <span className="font-mono text-muted-foreground">Loading...</span>
                </div>
              ) : dailyUsage && dailyUsage.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-end gap-1 h-32" data-testid="chart-daily-usage">
                    {Array.from({ length: 30 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (29 - i));
                      const dateStr = date.toISOString().split('T')[0];
                      const dayData = dailyUsage.find(d => d.date === dateStr);
                      const cost = dayData?.cost || 0;
                      const heightPercent = (cost / maxDailyCost) * 100;
                      
                      return (
                        <div 
                          key={dateStr}
                          className="flex-1 bg-foreground hover:bg-foreground/80 transition-colors min-h-[2px]"
                          style={{ height: `${Math.max(heightPercent, 2)}%` }}
                          title={`${dateStr}: ${formatCurrency(cost, currency)}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>30 days ago</span>
                    <span>Today</span>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center">
                  <span className="font-mono text-muted-foreground">No usage data yet</span>
                </div>
              )}
            </div>

            {modelUsage && modelUsage.length > 0 && (
              <div className="border-2 border-border p-6" style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}>
                <h2 className="font-mono text-sm uppercase tracking-wider font-bold mb-4 text-muted-foreground">
                  [ By Model - This Month ]
                </h2>
                <div className="space-y-3">
                  {modelUsage.map((usage) => (
                    <div key={usage.model} className="flex justify-between items-center">
                      <span className="font-mono text-sm">{getModelLabel(usage.model)}</span>
                      <span className="font-mono text-sm font-bold" data-testid={`text-model-${usage.model}`}>
                        {formatCurrency(usage.cost, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
