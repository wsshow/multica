package realtime

// Counter-compatible boundaries deliberately retain no operational data.
type Counter struct{}

func (Counter) Add(int64) int64 { return 0 }
func (Counter) Store(int64)     {}
func (Counter) Load() int64     { return 0 }

type Flag struct{}

func (Flag) Store(bool) {}
func (Flag) Load() bool { return false }

type Value struct{}

func (Value) Store(any) {}
func (Value) Load() any { return nil }

type Metrics struct {
	ConnectsTotal                 Counter
	DisconnectsTotal              Counter
	ActiveConnections             Counter
	SlowEvictionsTotal            Counter
	MessagesSentTotal             Counter
	MessagesDroppedTotal          Counter
	MembershipRemovalDroppedTotal Counter
	InboundTooLargeTotal          Counter
	RedisXAddTotal                Counter
	RedisXAddErrors               Counter
	RedisXReadTotal               Counter
	RedisXReadErrors              Counter
	RedisAckTotal                 Counter
	RedisLastXAddLagMicros        Counter
	RedisMirrorPrimaryErrors      Counter
	RedisMirrorSecondaryErrors    Counter
	RedisMirrorDivergenceTotal    Counter
	RedisRelayStreamTrimmedTotal  Counter
	RedisRelayStreamMissingTotal  Counter
	RedisRelayRetentionErrors     Counter
	RedisRelayStreamsWithoutTTL   Counter
	RedisUsedMemoryBytes          Counter
	RedisMaxMemoryBytes           Counter
	RedisEvictedKeys              Counter
	RedisConnected                Flag
	NodeID                        Value
}

var M = &Metrics{}

func (*Metrics) Reset()                   {}
func (*Metrics) Snapshot() map[string]any { return map[string]any{} }

type RedisStreamObservation struct {
	Entries    int64 `json:"entries"`
	PTTLMillis int64 `json:"pttl_millis"`
}

var discardedCounter Counter

func (*Metrics) RecordEvent(string)                                         {}
func (*Metrics) SubscribesTotal(string) *Counter                            { return &discardedCounter }
func (*Metrics) UnsubscribesTotal(string) *Counter                          { return &discardedCounter }
func (*Metrics) SubscribeDeniedTotal(string) *Counter                       { return &discardedCounter }
func (*Metrics) IncRoom(string)                                             {}
func (*Metrics) DecRoom(string)                                             {}
func (*Metrics) SetRedisLastError(string)                                   {}
func (*Metrics) ObserveRedisStream(string, int64, int64)                    {}
func (*Metrics) RedisStreamObservations() map[string]RedisStreamObservation { return nil }
func (*Metrics) SetRedisStreamsWithoutTTL(string, int64)                    {}
