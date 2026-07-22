package repository

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/upay/gateway/internal/models"
)

// ============================================================================
// TEAM MEMBERS
// ============================================================================

const teamMemberCols = `id, merchant_id, email, name, role, password_hash, status,
	invite_token_hash, invite_expires_at, created_at, updated_at`

func scanTeamMember(row rowScanner) (*models.TeamMember, error) {
	m := &models.TeamMember{}
	err := row.Scan(&m.ID, &m.MerchantID, &m.Email, &m.Name, &m.Role, &m.PasswordHash,
		&m.Status, &m.InviteTokenHash, &m.InviteExpiresAt, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *Repository) ListTeamMembers(ctx context.Context, merchantID uuid.UUID) ([]models.TeamMember, error) {
	rows, err := r.db.Query(ctx,
		`SELECT `+teamMemberCols+` FROM merchant_team_members WHERE merchant_id = $1 ORDER BY created_at`,
		merchantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.TeamMember
	for rows.Next() {
		m, err := scanTeamMember(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *m)
	}
	return out, rows.Err()
}

func (r *Repository) GetTeamMemberByEmail(ctx context.Context, email string) (*models.TeamMember, error) {
	m, err := scanTeamMember(r.db.QueryRow(ctx,
		`SELECT `+teamMemberCols+` FROM merchant_team_members WHERE lower(email) = lower($1)`,
		strings.TrimSpace(email)))
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return m, err
}

func (r *Repository) GetTeamMemberByID(ctx context.Context, merchantID, id uuid.UUID) (*models.TeamMember, error) {
	m, err := scanTeamMember(r.db.QueryRow(ctx,
		`SELECT `+teamMemberCols+` FROM merchant_team_members WHERE id = $1 AND merchant_id = $2`,
		id, merchantID))
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return m, err
}

func (r *Repository) GetTeamMemberByInviteToken(ctx context.Context, tokenHash string) (*models.TeamMember, error) {
	m, err := scanTeamMember(r.db.QueryRow(ctx,
		`SELECT `+teamMemberCols+` FROM merchant_team_members
		 WHERE invite_token_hash = $1 AND status = 'invited' AND invite_expires_at > NOW()`,
		tokenHash))
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return m, err
}

func (r *Repository) CreateTeamMember(ctx context.Context, m *models.TeamMember) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO merchant_team_members
			(id, merchant_id, email, name, role, password_hash, status, invite_token_hash, invite_expires_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
		m.ID, m.MerchantID, strings.ToLower(strings.TrimSpace(m.Email)), m.Name, m.Role,
		m.PasswordHash, m.Status, m.InviteTokenHash, m.InviteExpiresAt)
	return err
}

func (r *Repository) UpdateTeamMemberRoleStatus(ctx context.Context, merchantID, id uuid.UUID, role, status string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE merchant_team_members SET
			role   = COALESCE(NULLIF($3,''), role),
			status = COALESCE(NULLIF($4,''), status),
			updated_at = NOW()
		WHERE id = $1 AND merchant_id = $2`,
		id, merchantID, role, status)
	return err
}

func (r *Repository) ActivateTeamMember(ctx context.Context, id uuid.UUID, name, passwordHash string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE merchant_team_members SET
			name = $2, password_hash = $3, status = 'active',
			invite_token_hash = NULL, invite_expires_at = NULL, updated_at = NOW()
		WHERE id = $1`,
		id, name, passwordHash)
	return err
}

// RefreshTeamInvite re-issues an invite token for a still-invited member.
func (r *Repository) RefreshTeamInvite(ctx context.Context, id uuid.UUID, tokenHash string, expires time.Time) error {
	_, err := r.db.Exec(ctx, `
		UPDATE merchant_team_members SET
			invite_token_hash = $2, invite_expires_at = $3, updated_at = NOW()
		WHERE id = $1 AND status = 'invited'`,
		id, tokenHash, expires)
	return err
}

func (r *Repository) DeleteTeamMember(ctx context.Context, merchantID, id uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM merchant_team_members WHERE id = $1 AND merchant_id = $2`, id, merchantID)
	return err
}
