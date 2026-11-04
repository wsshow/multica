package storage

import (
	"os"
	"path/filepath"
	"testing"
)

func TestRequiredObjectStorageDoesNotCreateLocalFiles(t *testing.T) {
	t.Setenv("S3_BUCKET", "")
	path := filepath.Join(t.TempDir(), "uploads")
	t.Setenv("LOCAL_UPLOAD_DIR", path)
	if _, err := NewFromEnv(true); err == nil {
		t.Fatal("missing S3 configuration must fail")
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("local upload directory must not be created: %v", err)
	}
}

func TestConfiguredS3ErrorDoesNotFallBackToLocal(t *testing.T) {
	t.Setenv("S3_BUCKET", "test-bucket")
	configPath := filepath.Join(t.TempDir(), "invalid-aws-config")
	if err := os.WriteFile(configPath, []byte("[unclosed section"), 0600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("AWS_CONFIG_FILE", configPath)
	path := filepath.Join(t.TempDir(), "uploads")
	t.Setenv("LOCAL_UPLOAD_DIR", path)
	if _, err := NewFromEnv(false); err == nil {
		t.Fatal("explicit invalid AWS configuration must fail")
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("S3 failure created local upload directory: %v", err)
	}
}
