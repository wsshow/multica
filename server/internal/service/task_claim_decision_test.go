package service

import (
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
)

// This runs without a database: claimReasonFor, normalizeClaimPath, and the
// metric funnel are pure functions over their arguments.

// TestClaimDecisionReasonFor pins the outcome -> reason mapping, especially
// the #8551 split inside no_tasks: candidates > 0 means work was visible and
// nothing was claimed on this attempt (exact cause unknown), zero candidates
// on a list-bearing path means the candidate query saw nothing claimable, and
// the list-less agent path can only report "unknown".
func TestClaimDecisionReasonFor(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		outcome string
		scope   claimScope
		want    string
	}{
		{name: "claimed stays claimed", outcome: claimOutcomeClaimed, scope: claimScope{claimPath: claimPathAgent}, want: claimReasonClaimed},
		{name: "claimed via runtime poll", outcome: claimOutcomeClaimed, scope: claimScope{claimPath: claimPathRuntime, candidates: 3}, want: claimReasonClaimed},
		{name: "no capacity maps to concurrency cap", outcome: claimOutcomeNoCapacity, scope: claimScope{claimPath: claimPathRuntime}, want: claimReasonAgentConcurrencyCap},
		{name: "runtime no capacity maps to runtime cap", outcome: claimOutcomeRuntimeNoCapacity, scope: claimScope{claimPath: claimPathBatch}, want: claimReasonRuntimeConcurrencyCap},
		{name: "no runtime maps to unbound agent", outcome: claimOutcomeNoRuntime, scope: claimScope{claimPath: claimPathAgent}, want: claimReasonAgentUnbound},
		{name: "runtime mismatch maps to rebound agent", outcome: claimOutcomeRuntimeMismatch, scope: claimScope{claimPath: claimPathRuntime}, want: claimReasonAgentRebound},

		{name: "no tasks with candidates is unclaimed", outcome: claimOutcomeNoTasks, scope: claimScope{claimPath: claimPathRuntime, candidates: 1}, want: claimReasonCandidatesUnclaimed},
		{name: "no tasks unclaimed on batch path", outcome: claimOutcomeNoTasks, scope: claimScope{claimPath: claimPathBatch, candidates: 2}, want: claimReasonCandidatesUnclaimed},
		{name: "no tasks without candidates is nothing visible", outcome: claimOutcomeNoTasks, scope: claimScope{claimPath: claimPathRuntime}, want: claimReasonNoVisibleCandidates},
		{name: "no tasks without candidates on batch", outcome: claimOutcomeNoTasks, scope: claimScope{claimPath: claimPathBatch}, want: claimReasonNoVisibleCandidates},
		{name: "no tasks on agent path is unknown", outcome: claimOutcomeNoTasks, scope: claimScope{claimPath: claimPathAgent}, want: claimReasonUnknownCandidates},
		{name: "agent path with candidates is still unclaimed", outcome: claimOutcomeNoTasks, scope: claimScope{claimPath: claimPathAgent, candidates: 1}, want: claimReasonCandidatesUnclaimed},

		{name: "empty cache hit", outcome: claimOutcomeEmptyCacheHit, scope: claimScope{claimPath: claimPathRuntime}, want: claimReasonEmptyCache},
		{name: "empty db means nothing visible", outcome: claimOutcomeEmptyDB, scope: claimScope{claimPath: claimPathRuntime}, want: claimReasonNoVisibleCandidates},
		{name: "empty db on batch means nothing visible", outcome: claimOutcomeEmptyDB, scope: claimScope{claimPath: claimPathBatch}, want: claimReasonNoVisibleCandidates},
		{name: "reclaimed dispatch", outcome: claimOutcomeReclaimedDispatched, scope: claimScope{claimPath: claimPathBatch}, want: claimReasonStaleDispatchRecover},

		{name: "error get agent", outcome: claimOutcomeErrorGetAgent, scope: claimScope{claimPath: claimPathAgent}, want: claimReasonError},
		{name: "error count running", outcome: claimOutcomeErrorCountRunning, scope: claimScope{claimPath: claimPathRuntime}, want: claimReasonError},
		{name: "error claim", outcome: claimOutcomeErrorClaim, scope: claimScope{claimPath: claimPathRuntime}, want: claimReasonError},
		{name: "error reanchor chat input", outcome: claimOutcomeErrorReanchorChatInput, scope: claimScope{claimPath: claimPathRuntime}, want: claimReasonError},
		{name: "error transaction", outcome: claimOutcomeErrorTransaction, scope: claimScope{claimPath: claimPathBatch}, want: claimReasonError},
		{name: "error promote deferred", outcome: claimOutcomeErrorPromoteDeferred, scope: claimScope{claimPath: claimPathBatch}, want: claimReasonError},
		{name: "error reclaim dispatched", outcome: claimOutcomeErrorReclaimDispatched, scope: claimScope{claimPath: claimPathRuntime}, want: claimReasonError},
		{name: "error list", outcome: claimOutcomeErrorList, scope: claimScope{claimPath: claimPathBatch}, want: claimReasonError},

		// Unknown inputs degrade to "error" instead of minting a series.
		{name: "unrecognized outcome", outcome: "no_task", scope: claimScope{claimPath: claimPathRuntime}, want: claimReasonError},
		{name: "bogus outcome", outcome: "surprise", scope: claimScope{claimPath: claimPathAgent}, want: claimReasonError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := claimReasonFor(tt.outcome, tt.scope)
			if got != tt.want {
				t.Fatalf("claimReasonFor(%q, %+v) = %q, want %q", tt.outcome, tt.scope, got, tt.want)
			}
		})
	}
}

// TestClaimDecisionNormalizePath keeps the claim_path label a closed enum.
func TestClaimDecisionNormalizePath(t *testing.T) {
	t.Parallel()

	tests := []struct {
		claimPath string
		want      string
	}{
		{claimPath: claimPathAgent, want: claimPathAgent},
		{claimPath: claimPathRuntime, want: claimPathRuntime},
		{claimPath: claimPathBatch, want: claimPathBatch},
		{claimPath: "", want: "other"},
		{claimPath: "daemon", want: "other"},
		{claimPath: "AGENT", want: "other"},
	}

	for _, tt := range tests {
		t.Run(tt.claimPath, func(t *testing.T) {
			t.Parallel()
			if got := normalizeClaimPath(tt.claimPath); got != tt.want {
				t.Fatalf("normalizeClaimPath(%q) = %q, want %q", tt.claimPath, got, tt.want)
			}
		})
	}
}

// TestClaimDecisionNilMetricsIsSafe covers self-hosted deployments and tests
// that run without the metrics listener: the funnel must not panic and must
// still skip the (suppressed) hot-path log branches.
func TestClaimDecisionNilMetricsIsSafe(t *testing.T) {
	t.Parallel()

	svc := &TaskService{}
	for _, outcome := range []string{
		claimOutcomeClaimed,
		claimOutcomeNoTasks,
		claimOutcomeNoCapacity,
		claimOutcomeNoRuntime,
		claimOutcomeRuntimeMismatch,
		claimOutcomeEmptyCacheHit,
		claimOutcomeEmptyDB,
		claimOutcomeErrorClaim,
	} {
		svc.recordClaimDecision(pgtype.UUID{}, pgtype.UUID{}, outcome, claimScope{claimPath: claimPathRuntime, candidates: 1}, claimDecisionDetail{running: 2, maxConcurrent: 2})
	}
}

// ---- helpers ---------------------------------------------------------------
