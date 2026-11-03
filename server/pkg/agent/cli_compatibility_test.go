package agent

import "testing"

func TestRuntimeCLICompatibilityVersion(t *testing.T) {
	for _, tc := range []struct{ metadata, want string }{
		{`{"cli_version":"0.1.2","cli_compatibility_version":"0.7.2"}`, "0.7.2"},
		{`{"cli_version":"0.4.3"}`, "0.4.3"},
		{`{"cli_version":"0.4.3","cli_compatibility_version":" "}`, "0.4.3"},
		{`{"cli_version":"0.7.2","cli_compatibility_version":42}`, ""},
		{`{"cli_version":"0.7.2","cli_compatibility_version":"invalid"}`, "invalid"},
		{`{}`, ""}, {`[]`, ""}, {`invalid`, ""},
	} {
		if got := RuntimeCLICompatibilityVersion([]byte(tc.metadata)); got != tc.want {
			t.Errorf("metadata %s: got %q, want %q", tc.metadata, got, tc.want)
		}
	}
	if err := CheckMinCLIVersionFor(CLICompatibilityVersion, MinQuickCreateFieldsCLIVersion); err != nil {
		t.Fatalf("customized CLI must support explicit quick-create fields: %v", err)
	}
}
