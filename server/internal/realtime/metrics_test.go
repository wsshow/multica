package realtime

import "testing"

func TestMetricsDoNotRetainData(t *testing.T) {
	m := &Metrics{}
	m.ActiveConnections.Add(1)
	m.SubscribesTotal("workspace").Add(1)
	m.RecordEvent("issue:updated")
	m.SetRedisLastError("private error")
	m.ObserveRedisStream("private stream", 10, 100)
	if m.ActiveConnections.Load() != 0 || len(m.Snapshot()) != 0 || len(m.RedisStreamObservations()) != 0 {
		t.Fatal("retained operational data")
	}
}
