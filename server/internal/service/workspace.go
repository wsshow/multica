package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/multica-ai/multica/server/internal/issuestatus"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

var (
	ErrAddWorkspaceOwner        = errors.New("failed to add owner")
	ErrSeedWorkspaceIssueStatus = errors.New("failed to seed issue statuses")
	nonAlphanumeric             = regexp.MustCompile(`[^a-zA-Z0-9]`)
)

// DefaultWorkspaceIssuePrefix uses the first four alphanumeric characters of the
// slug. Keep the preview in packages/views/onboarding/steps/step-workspace.tsx in sync.
func DefaultWorkspaceIssuePrefix(slug string) string {
	head := nonAlphanumeric.ReplaceAllString(slug, "")
	if head == "" {
		return "WS"
	}
	if len(head) > 4 {
		head = head[:4]
	}
	return strings.ToUpper(head)
}

func CreateWorkspaceWithOwner(ctx context.Context, tx pgx.Tx, userID pgtype.UUID, params db.CreateWorkspaceParams) (db.Workspace, error) {
	if params.IssuePrefix == "" {
		params.IssuePrefix = DefaultWorkspaceIssuePrefix(params.Slug)
	}
	queries := db.New(tx)
	workspace, err := queries.CreateWorkspace(ctx, params)
	if err != nil {
		return db.Workspace{}, err
	}
	if _, err := queries.CreateMember(ctx, db.CreateMemberParams{
		WorkspaceID: workspace.ID,
		UserID:      userID,
		Role:        "owner",
	}); err != nil {
		return db.Workspace{}, fmt.Errorf("%w: %w", ErrAddWorkspaceOwner, err)
	}
	// Initial issue creation needs a populated status catalog as soon as the workspace is visible.
	if err := issuestatus.Ensure(ctx, queries, workspace.ID); err != nil {
		return db.Workspace{}, fmt.Errorf("%w: %w", ErrSeedWorkspaceIssueStatus, err)
	}
	return workspace, nil
}
