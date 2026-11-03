package handler

import (
	"context"

	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/multica-ai/multica/server/internal/events"
	obsmetrics "github.com/multica-ai/multica/server/internal/metrics"
	"github.com/multica-ai/multica/server/internal/service"
	"github.com/multica-ai/multica/server/internal/testutil"
	"github.com/multica-ai/multica/server/pkg/protocol"
)

func TestReportTaskUsageSnapshotsReplaceRowsAndOnlyMeterTerminal(t *testing.T) {
	issueID := dbfx.Issue(t, "live usage")
	agentID := dbfx.Agent(t, "live usage agent", testRuntimeID)
	taskID := dbfx.Task(t, agentID, testutil.Cols{"issue_id": issueID, "runtime_id": testRuntimeID, "status": "running"})
	h := *testHandler
	h.Bus = events.New()
	h.TaskService = service.NewTaskService(h.Queries, testPool, h.Hub, h.Bus)
	m := obsmetrics.NewBusinessMetrics()
	h.TaskService.Metrics = m
	var updates []events.Event
	h.Bus.Subscribe(protocol.EventTaskUsage, func(e events.Event) { updates = append(updates, e) })
	path := "/api/daemon/tasks/" + taskID + "/usage"
	entry := TaskUsagePayload{Provider: "Anthropic", Model: "claude-opus-5", InputTokens: 100, OutputTokens: 50,
		CacheReadTokens: 20, CacheWriteTokens: 10, CostUSDTicks: 10_000_000_000}
	report := func(snapshot bool) {
		t.Helper()
		body := map[string]any{"usage": []TaskUsagePayload{entry}}
		if snapshot {
			body["snapshot"] = true
		}
		req := withURLParam(newOwnerDaemonRequest(http.MethodPost, path, body), "taskId", taskID)
		var response map[string]string
		testutil.Call(t, h.ReportTaskUsage, req).Want(http.StatusOK).JSON(&response)
		if response["status"] != "ok" {
			t.Fatalf("usage response = %v", response)
		}
	}

	// Neither malformed input nor an unrelated daemon may write or notify.
	bad := withURLParam(newOwnerDaemonRequest(http.MethodPost, path, map[string]any{
		"usage": []TaskUsagePayload{entry}, "snapshot": "yes",
	}), "taskId", taskID)
	testutil.Call(t, h.ReportTaskUsage, bad).Want(http.StatusBadRequest)
	denied := withURLParam(newDaemonTokenRequest(http.MethodPost, path, map[string]any{
		"usage": []TaskUsagePayload{entry}, "snapshot": true,
	}, uuid.NewString(), uuid.NewString()), "taskId", taskID)
	testutil.Call(t, h.ReportTaskUsage, denied).Want(http.StatusNotFound)
	empty := withURLParam(newOwnerDaemonRequest(http.MethodPost, path, map[string]any{"usage": []TaskUsagePayload{}, "snapshot": true}), "taskId", taskID)
	testutil.Call(t, h.ReportTaskUsage, empty).Want(http.StatusOK)
	if len(updates) != 0 {
		t.Fatal("rejected or empty usage published a refresh")
	}

	report(true)
	entry.InputTokens = 200
	report(true)
	rows, err := h.Queries.GetTaskUsage(context.Background(), parseUUID(taskID))
	if err != nil || len(rows) != 1 {
		t.Fatalf("snapshot rows = %v, err=%v; want one overwritten row", rows, err)
	}
	if rows[0].InputTokens != 200 || rows[0].Provider != "anthropic" || rows[0].CostUsdTicks.Int64 != entry.CostUSDTicks {
		t.Fatalf("latest cumulative snapshot was not preserved: %+v", rows[0])
	}

	// Omitting snapshot is the existing daemon contract and still meters once.
	entry.InputTokens = 300
	report(false)
	rows, err = h.Queries.GetTaskUsage(context.Background(), parseUUID(taskID))
	if err != nil || len(rows) != 1 || rows[0].InputTokens != 300 {
		t.Fatalf("terminal usage = %v, err=%v; want one row with 300 input tokens", rows, err)
	}

	if len(updates) != 3 {
		t.Fatalf("refresh events = %d, want one per successful report", len(updates))
	}
	for _, update := range updates {
		payload, ok := update.Payload.(protocol.TaskUsageUpdatedPayload)
		if !ok || update.WorkspaceID != testWorkspaceID || update.TaskID != taskID || payload.TaskID != taskID {
			t.Errorf("usage refresh has wrong scope: %+v", update)
		}
	}
}
