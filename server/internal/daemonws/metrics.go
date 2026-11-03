package daemonws

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
	ConnectsTotal             Counter
	DisconnectsTotal          Counter
	ActiveConnections         Counter
	SlowEvictionsTotal        Counter
	WakeupPublishedTotal      Counter
	WakeupPublishErrors       Counter
	WakeupReceivedTotal       Counter
	WakeupDeliveredHit        Counter
	WakeupDeliveredMiss       Counter
	RuntimeGoneDeliveredHit   Counter
	RuntimeGoneDeliveredMiss  Counter
	RuntimeGonePublishedTotal Counter
	RuntimeGonePublishErrors  Counter
	RuntimeGoneReceivedTotal  Counter
}

var M = &Metrics{}

func (*Metrics) Reset()                   {}
func (*Metrics) Snapshot() map[string]any { return map[string]any{} }
