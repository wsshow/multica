package storage

import (
	"fmt"
	"os"
)

// NewFromEnv never selects local storage after an explicitly configured S3 error.
func NewFromEnv(requireObjectStorage bool) (Storage, error) {
	s3, err := NewS3StorageFromEnv()
	if err != nil {
		return nil, err
	}
	if s3 != nil {
		return s3, nil
	}
	if requireObjectStorage {
		return nil, fmt.Errorf("S3_BUCKET is required when MULTICA_REQUIRE_OBJECT_STORAGE=true")
	}
	local := NewLocalStorageFromEnv()
	if local == nil {
		return nil, fmt.Errorf("initialize local upload storage: check LOCAL_UPLOAD_DIR permissions")
	}
	return local, nil
}

func ObjectStorageRequired() bool {
	return os.Getenv("MULTICA_REQUIRE_OBJECT_STORAGE") == "true"
}
