package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type SupportTicket struct {
	ID           uuid.UUID `json:"id"`
	MerchantID   uuid.UUID `json:"merchant_id"`
	MerchantName string    `json:"merchant_name"`
	Subject      string    `json:"subject"`
	Message      string    `json:"message"`
	Context      string    `json:"context"`
	Status       string    `json:"status"`
	AdminNote    string    `json:"admin_note"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (r *Repository) CreateSupportTicket(ctx context.Context, merchantID uuid.UUID, subject, message, chatContext string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO support_tickets (merchant_id, subject, message, context)
		VALUES ($1, $2, $3, $4)
	`, merchantID, subject, message, chatContext)
	return err
}

func (r *Repository) ListSupportTickets(ctx context.Context, status string) ([]SupportTicket, error) {
	query := `
		SELECT st.id, st.merchant_id, COALESCE(m.name,'') as merchant_name,
		       st.subject, st.message, COALESCE(st.context,''),
		       st.status, COALESCE(st.admin_note,''),
		       st.created_at, st.updated_at
		FROM support_tickets st
		LEFT JOIN merchants m ON m.id = st.merchant_id`

	args := []interface{}{}
	if status != "" {
		query += ` WHERE st.status = $1`
		args = append(args, status)
	}
	query += ` ORDER BY st.created_at DESC LIMIT 200`

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []SupportTicket
	for rows.Next() {
		var t SupportTicket
		if err := rows.Scan(&t.ID, &t.MerchantID, &t.MerchantName,
			&t.Subject, &t.Message, &t.Context,
			&t.Status, &t.AdminNote,
			&t.CreatedAt, &t.UpdatedAt); err != nil {
			if err == pgx.ErrNoRows {
				break
			}
			return nil, err
		}
		tickets = append(tickets, t)
	}
	if tickets == nil {
		tickets = []SupportTicket{}
	}
	return tickets, nil
}

func (r *Repository) ListMerchantTickets(ctx context.Context, merchantID uuid.UUID) ([]SupportTicket, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, merchant_id, '' as merchant_name,
		       subject, message, COALESCE(context,''),
		       status, COALESCE(admin_note,''),
		       created_at, updated_at
		FROM support_tickets
		WHERE merchant_id = $1
		ORDER BY created_at DESC LIMIT 100
	`, merchantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []SupportTicket
	for rows.Next() {
		var t SupportTicket
		if err := rows.Scan(&t.ID, &t.MerchantID, &t.MerchantName,
			&t.Subject, &t.Message, &t.Context,
			&t.Status, &t.AdminNote,
			&t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tickets = append(tickets, t)
	}
	if tickets == nil {
		tickets = []SupportTicket{}
	}
	return tickets, nil
}

func (r *Repository) UpdateSupportTicket(ctx context.Context, id uuid.UUID, status, adminNote string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE support_tickets
		SET status = CASE WHEN $2 != '' THEN $2 ELSE status END,
		    admin_note = CASE WHEN $3 != '' THEN $3 ELSE admin_note END,
		    updated_at = NOW()
		WHERE id = $1
	`, id, status, adminNote)
	return err
}
