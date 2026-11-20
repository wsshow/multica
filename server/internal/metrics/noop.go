// Package metrics keeps upstream instrumentation call sites inert in this build.
package metrics

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/multica-ai/multica/server/internal/analytics"
	"github.com/multica-ai/multica/server/internal/daemonws"
	"github.com/multica-ai/multica/server/internal/realtime"
	"net/http"
	"time"
)

type Config struct{ Addr string }

func ConfigFromEnv() Config      { return Config{} }
func (Config) Enabled() bool     { return false }
func IsLoopbackAddr(string) bool { return false }

type BusinessMetrics struct{}
type HTTPMetrics struct{}
type ChannelLeaseMetrics struct{}
type WecomMetrics struct{}
type DBRoutingMetrics struct{}
type Counter struct{}

func (Counter) Inc()        {}
func (Counter) Add(float64) {}

type ChannelMediaReconcilerMetrics struct{ ObjectsDeleted, RowsReferenced, DeleteFailures, TombstoneReferenced Counter }
type RegistryOptions struct {
	Pool, ReplicaPool *pgxpool.Pool
	Realtime          *realtime.Metrics
	DaemonWS          *daemonws.Metrics
	Version, Commit   string
}
type Registry struct {
	InboxRead    *InboxReadMetrics
	Gatherer     any
	HTTP         *HTTPMetrics
	Business     *BusinessMetrics
	ChannelMedia *ChannelMediaReconcilerMetrics
	ChannelLease *ChannelLeaseMetrics
	Wecom        *WecomMetrics
	DBRouting    *DBRoutingMetrics
}

func NewRegistry(RegistryOptions) *Registry                                                    { return &Registry{} }
func NewHandler(any) http.Handler                                                              { return http.NotFoundHandler() }
func NewServer(string, any) *http.Server                                                       { return nil }
func (*HTTPMetrics) Middleware(next http.Handler) http.Handler                                 { return next }
func (*BusinessMetrics) RecordIssueMetadataMutation(op, result string, duration time.Duration) {}
func (*BusinessMetrics) RecordEntitlementConfigError()                                         {}
func (*BusinessMetrics) RecordEntitlementCache(outcome string)                                 {}
func (*BusinessMetrics) RecordEntitlementRefresh(outcome string, seconds float64)              {}
func (*BusinessMetrics) RecordEntitlementDecision(gate, action, reason string)                 {}
func (*BusinessMetrics) RecordClaimDecision(claimPath, outcome, reason string)                 {}
func (*BusinessMetrics) RecordAgentRuntimeLookup(source, result string)                        {}
func (*BusinessMetrics) RecordEntitlementVersionRegression()                                   {}
func (*BusinessMetrics) RecordAutopilotQuotaDecision(action, source, result string)            {}
func (*BusinessMetrics) RecordRuntimeGCDeleted()                                               {}
func (*BusinessMetrics) RecordRuntimeGCFailed()                                                {}
func (*BusinessMetrics) RecordRuntimeGCSkipped(reason string)                                  {}
func (*BusinessMetrics) ObserveRuntimeSweepStage(stage string, duration time.Duration, candidates, changed int) {
}
func (*BusinessMetrics) RecordTaskEnqueued(source, runtimeMode string) {}
func (*BusinessMetrics) RecordTaskDispatched(taskID, source, runtimeMode string, queueWaitSeconds, claimableWaitSeconds float64) {
}
func (*BusinessMetrics) RecordTaskStarted(source, runtimeMode, provider string) {}
func (*BusinessMetrics) RecordTaskTerminal(taskID, source, runtimeMode, terminalStatus string, runSeconds, totalSeconds float64, attempt int32) {
}
func (*BusinessMetrics) RecordTaskFailed(source, runtimeMode, failureReason string) {}
func (*BusinessMetrics) RecordTaskQueuedExpired(source, runtimeMode string)         {}
func (*BusinessMetrics) RecordTaskLeaseExpired(source string)                       {}
func (*BusinessMetrics) RecordChatClaimSessionFallbackNeeded()                      {}
func (*BusinessMetrics) RecordChatClaimSessionFallbackHit()                         {}
func (*BusinessMetrics) RecordChatClaimSessionFallbackMiss()                        {}
func (*BusinessMetrics) RecordChatClaimSessionFallbackError()                       {}
func (*BusinessMetrics) ObserveChatClaimLastSessionQuery(seconds float64)           {}
func (*BusinessMetrics) ObserveChatClaimRolloutMissingQuery(seconds float64)        {}
func (*BusinessMetrics) RecordLLMUsage(source, runtimeMode, rawProvider, modelAlias string, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, costUSDTicks int64) {
}
func RecordEvent(client analytics.Client, m *BusinessMetrics, ev analytics.Event)             {}
func (*BusinessMetrics) IncForEvent(ev analytics.Event)                                       {}
func (*BusinessMetrics) RecordAutopilotRunSkipped(cadence, reason string)                     {}
func (*BusinessMetrics) RecordWebhookDelivery(provider, status string)                        {}
func (*BusinessMetrics) RecordWebhookRateLimited(gate string)                                 {}
func (*BusinessMetrics) RecordEmailRateLimited(action, gate string)                           {}
func (*BusinessMetrics) RecordGithubEventReceived(eventKind, action string)                   {}
func (*BusinessMetrics) RecordGithubPRReview(result string)                                   {}
func (*BusinessMetrics) ObserveGithubPRMergeSeconds(seconds float64)                          {}
func (*BusinessMetrics) RecordCloudRuntimeRequest(op, status string, durationSeconds float64) {}
func (*BusinessMetrics) RecordChatOutputLocalPath(kind string)                                {}
func (*BusinessMetrics) RecordDaemonWSMessageReceived(kind string)                            {}
func (*ChannelLeaseMetrics) RecordLeaseOperation(operation, outcome string)                   {}
func (*ChannelLeaseMetrics) SetActiveLeaseOwners(count float64)                               {}
func (*ChannelLeaseMetrics) SetOwnersWithRenewalErrors(count float64)                         {}
func (*ChannelLeaseMetrics) SetLastSuccessfulRenewal(at time.Time)                            {}
func (*ChannelLeaseMetrics) ObserveTakeoverLatency(delay time.Duration)                       {}
func (*DBRoutingMetrics) RecordReadRoute(business, role, reason string)                       {}
func (*WecomMetrics) RecordConnectFailure()                                                   {}
func (*WecomMetrics) RecordAuthFailure()                                                      {}
func (*WecomMetrics) RecordCallbackQueued()                                                   {}
func (*WecomMetrics) RecordCallbackQueueBlocked()                                             {}
func (*WecomMetrics) RecordOutboundDelivered()                                                {}
func (*WecomMetrics) RecordOutboundDropped(reason string)                                     {}
func (*WecomMetrics) RecordOutboundSkipped(reason string)                                     {}
func (*WecomMetrics) RecordAttachmentDelivered()                                              {}
func (*WecomMetrics) RecordAttachmentDropped(reason string)                                   {}
func (*WecomMetrics) RecordAttachmentDeliveryShed()                                           {}
func (*WecomMetrics) RecordOutboundUnconfirmed(reason string)                                 {}
func (*WecomMetrics) RecordAttachmentUnconfirmed(reason string)                               {}
func (*WecomMetrics) RecordRelayShed(kind string)                                             {}
func (*WecomMetrics) RecordStreamOpened()                                                     {}
func (*WecomMetrics) RecordStreamFinished()                                                   {}
func (*WecomMetrics) RecordStreamFellBack()                                                   {}
func (*WecomMetrics) RecordMediaFailure(reason string)                                        {}
func NewBusinessMetrics() *BusinessMetrics                                                    { return &BusinessMetrics{} }
func NewHTTPMetrics() *HTTPMetrics                                                            { return &HTTPMetrics{} }
func NewChannelLeaseMetrics() *ChannelLeaseMetrics                                            { return &ChannelLeaseMetrics{} }
func NewWecomMetrics() *WecomMetrics                                                          { return &WecomMetrics{} }
func NewDBRoutingMetrics() *DBRoutingMetrics                                                  { return &DBRoutingMetrics{} }
func NewChannelMediaReconcilerMetrics() *ChannelMediaReconcilerMetrics {
	return &ChannelMediaReconcilerMetrics{}
}

const (
	RuntimeSweepStageDelegatedFailureRecovery = "delegated_failure_recovery"
	RuntimeSweepStageLiveness                 = "liveness"
	RuntimeSweepStageOfflineTasks             = "offline_tasks"
	RuntimeSweepStageReconnectRetries         = "reconnect_retries"
	RuntimeSweepStageGC                       = "gc"
	RuntimeSweepStageStaleTasks               = "stale_tasks"
	RuntimeSweepStageQueuedExpiry             = "queued_expiry"
	RuntimeSweepStageDeferredChatFinalization = "deferred_chat_finalization"
	RuntimeGCSkipEligibilityChanged           = "eligibility_changed"
	RuntimeGCSkipWorkspaceMismatch            = "workspace_mismatch"
	RuntimeGCSkipNonTerminalTask              = "non_terminal_task"
)
