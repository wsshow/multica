package agent

import (
	"encoding/json"
	"strings"
)

// CLICompatibilityVersion tracks implemented upstream CLI contracts, independently
// of this edition's release version. Review it when importing upstream features.
const CLICompatibilityVersion = "0.10.0"

func RuntimeCLICompatibilityVersion(metadata []byte) string {
	var values map[string]any
	if json.Unmarshal(metadata, &values) != nil {
		return ""
	}
	if value := values["cli_compatibility_version"]; value != nil {
		version, ok := value.(string)
		if !ok {
			return ""
		}
		if version = strings.TrimSpace(version); version != "" {
			return version
		}
	}
	version, _ := values["cli_version"].(string)
	return version
}
