import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../api/client";
import { ProcessingView } from "../components/processing";
import type {
  ProcessingRule,
  ProcessingRun,
  RuleFormData,
} from "../components/processing";

interface ProcessingData {
  rules: ProcessingRule[];
  runs: ProcessingRun[];
}

export default function ProcessingPage() {
  const [data, setData] = useState<ProcessingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refresh = useCallback(() => {
    setError(null);
    return apiFetch<ProcessingData>("/api/processing")
      .then((next) => {
        if (!isMounted.current) return;
        setData(next);
      })
      .catch((err) => {
        if (!isMounted.current) return;
        setError((err as Error).message);
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsertRule = (rule: ProcessingRule) => {
    setData((prev) => {
      if (!prev) return { rules: [rule], runs: [] };
      const exists = prev.rules.some((r) => r.id === rule.id);
      const rules = exists
        ? prev.rules.map((r) => (r.id === rule.id ? rule : r))
        : [rule, ...prev.rules];
      const runs = prev.runs.map((run) =>
        run.ruleId === rule.id ? { ...run, ruleName: rule.name } : run,
      );
      return { rules, runs };
    });
  };

  const removeRule = (ruleId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        rules: prev.rules.filter((r) => r.id !== ruleId),
        runs: prev.runs.filter((run) => run.ruleId !== ruleId),
      };
    });
  };

  const prependRun = (run: ProcessingRun) => {
    setData((prev) => {
      if (!prev) return { rules: [], runs: [run] };
      return { ...prev, runs: [run, ...prev.runs] };
    });
  };

  const mutate = async (fn: () => Promise<void>) => {
    try {
      setError(null);
      await fn();
    } catch (err) {
      console.error("Processing mutation failed:", err);
      setError((err as Error).message);
      // Best-effort reconcile so UI doesn't drift
      await refresh();
    }
  };

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-500">Failed to load processing</p>
          <p className="text-xs text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      {error && (
        <div className="px-6 pt-6">
          <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          </div>
        </div>
      )}

      <ProcessingView
        rules={data.rules}
        runs={data.runs}
        onCreateRule={(payload: RuleFormData) =>
          mutate(async () => {
            const resp = await apiFetch<{ rule: ProcessingRule }>(
              "/api/processing/rules",
              { method: "POST", body: JSON.stringify(payload) },
            );
            upsertRule(resp.rule);
          })
        }
        onEditRule={(ruleId: string, payload: RuleFormData) =>
          mutate(async () => {
            const resp = await apiFetch<{ rule: ProcessingRule }>(
              `/api/processing/rules/${ruleId}`,
              { method: "PUT", body: JSON.stringify(payload) },
            );
            upsertRule(resp.rule);
          })
        }
        onDeleteRule={(ruleId: string) =>
          mutate(async () => {
            removeRule(ruleId);
            await apiFetch(`/api/processing/rules/${ruleId}`, {
              method: "DELETE",
            });
          })
        }
        onToggleRule={(ruleId: string, enabled: boolean) =>
          mutate(async () => {
            setData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                rules: prev.rules.map((r) =>
                  r.id === ruleId ? { ...r, enabled } : r,
                ),
              };
            });

            const resp = await apiFetch<{ rule: ProcessingRule }>(
              `/api/processing/rules/${ruleId}/toggle`,
              {
                method: "POST",
                body: JSON.stringify({ enabled }),
              },
            );
            upsertRule(resp.rule);
          })
        }
        onRunNow={(ruleId: string) =>
          mutate(async () => {
            const resp = await apiFetch<{ run: ProcessingRun; rule: ProcessingRule }>(
              `/api/processing/rules/${ruleId}/run`,
              { method: "POST" },
            );
            upsertRule(resp.rule);
            prependRun(resp.run);
          })
        }
      />
    </div>
  );
}

