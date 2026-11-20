package metrics

import "time"

type InboxReadMetrics struct{}

func NewInboxReadMetrics() *InboxReadMetrics                   { return &InboxReadMetrics{} }
func (*InboxReadMetrics) ObserveQuery(string, time.Duration)   {}
func (*InboxReadMetrics) Active(float64)                       {}
func (*InboxReadMetrics) Queue(float64)                        {}
func (*InboxReadMetrics) Reject(string, string)                {}
func (*InboxReadMetrics) Observe(string, time.Duration, error) {}
