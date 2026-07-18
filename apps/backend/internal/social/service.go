package social

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

var ErrForbidden = errors.New("forbidden")

type Service struct{ db *sql.DB }

func NewService(db *sql.DB) *Service { return &Service{db: db} }

type Recommendation struct {
	ID, SenderID, RecipientID string
	TMDBID                    int
	MediaType, Title          string
	PosterURL, Message        string
	CreatedAt                 time.Time
}

func (s *Service) Recommend(ctx context.Context, senderID, recipientID string, tmdbID int, mediaType, title, posterURL, message string) (Recommendation, error) {
	var friends bool
	err := s.db.QueryRowContext(ctx, `select exists(select 1 from friendships where status='accepted' and ((requester_id=$1 and addressee_id=$2) or (requester_id=$2 and addressee_id=$1)))`, senderID, recipientID).Scan(&friends)
	if err != nil || !friends {
		if err != nil {
			return Recommendation{}, err
		}
		return Recommendation{}, ErrForbidden
	}
	var out Recommendation
	err = s.db.QueryRowContext(ctx, `insert into friend_recommendations(sender_id,recipient_id,tmdb_id,media_type,title,poster_url,message) values($1,$2,$3,$4,$5,nullif($6,''),$7) returning id,sender_id,recipient_id,tmdb_id,media_type,title,coalesce(poster_url,''),message,created_at`, senderID, recipientID, tmdbID, mediaType, strings.TrimSpace(title), posterURL, strings.TrimSpace(message)).Scan(&out.ID, &out.SenderID, &out.RecipientID, &out.TMDBID, &out.MediaType, &out.Title, &out.PosterURL, &out.Message, &out.CreatedAt)
	return out, err
}

type List struct {
	ID          string    `json:"ID"`
	OwnerID     string    `json:"OwnerID"`
	Name        string    `json:"Name"`
	Visibility  string    `json:"Visibility"`
	ShareToken  string    `json:"ShareToken"`
	ItemCount   int       `json:"ItemCount"`
	MemberCount int       `json:"MemberCount"`
	CreatedAt   time.Time `json:"CreatedAt"`
}
type Item struct {
	ID        string    `json:"ID"`
	AddedBy   string    `json:"AddedBy"`
	TMDBID    int       `json:"TMDBID"`
	MediaType string    `json:"MediaType"`
	Title     string    `json:"Title"`
	PosterURL string    `json:"PosterURL"`
	CreatedAt time.Time `json:"CreatedAt"`
}

func (s *Service) CreateList(ctx context.Context, ownerID, name, visibility string) (List, error) {
	if visibility != "friends" && visibility != "public" {
		visibility = "private"
	}
	var out List
	err := s.db.QueryRowContext(ctx, `insert into shared_lists(owner_id,name,visibility) values($1,$2,$3) returning id,owner_id,name,visibility,share_token,created_at`, ownerID, strings.TrimSpace(name), visibility).Scan(&out.ID, &out.OwnerID, &out.Name, &out.Visibility, &out.ShareToken, &out.CreatedAt)
	return out, err
}

func (s *Service) Lists(ctx context.Context, userID string) ([]List, error) {
	rows, err := s.db.QueryContext(ctx, `select l.id,l.owner_id,l.name,l.visibility,l.share_token,l.created_at,(select count(*) from shared_list_items i where i.list_id=l.id),(select count(*) from shared_list_members m where m.list_id=l.id) from shared_lists l where l.owner_id=$1 or exists(select 1 from shared_list_members m where m.list_id=l.id and m.user_id=$1) order by l.updated_at desc`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []List
	for rows.Next() {
		var v List
		if err := rows.Scan(&v.ID, &v.OwnerID, &v.Name, &v.Visibility, &v.ShareToken, &v.CreatedAt, &v.ItemCount, &v.MemberCount); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *Service) canEdit(ctx context.Context, userID, listID string) (bool, error) {
	var ok bool
	err := s.db.QueryRowContext(ctx, `select exists(select 1 from shared_lists l where l.id=$2 and (l.owner_id=$1 or exists(select 1 from shared_list_members m where m.list_id=l.id and m.user_id=$1 and m.role='editor')))`, userID, listID).Scan(&ok)
	return ok, err
}

func (s *Service) AddItem(ctx context.Context, userID, listID string, tmdbID int, mediaType, title, posterURL string) (Item, error) {
	ok, err := s.canEdit(ctx, userID, listID)
	if err != nil {
		return Item{}, err
	}
	if !ok {
		return Item{}, ErrForbidden
	}
	var out Item
	err = s.db.QueryRowContext(ctx, `insert into shared_list_items(list_id,added_by,tmdb_id,media_type,title,poster_url) values($1,$2,$3,$4,$5,nullif($6,'')) on conflict(list_id,tmdb_id,media_type) do update set title=excluded.title returning id,added_by,tmdb_id,media_type,title,coalesce(poster_url,''),created_at`, listID, userID, tmdbID, mediaType, title, posterURL).Scan(&out.ID, &out.AddedBy, &out.TMDBID, &out.MediaType, &out.Title, &out.PosterURL, &out.CreatedAt)
	return out, err
}

func (s *Service) AddMember(ctx context.Context, ownerID, listID, memberID, role string) error {
	if role != "viewer" {
		role = "editor"
	}
	var allowed bool
	if err := s.db.QueryRowContext(ctx, `select exists(select 1 from shared_lists l join friendships f on f.status='accepted' and ((f.requester_id=$1 and f.addressee_id=$3) or (f.addressee_id=$1 and f.requester_id=$3)) where l.id=$2 and l.owner_id=$1)`, ownerID, listID, memberID).Scan(&allowed); err != nil {
		return err
	}
	if !allowed {
		return ErrForbidden
	}
	_, err := s.db.ExecContext(ctx, `insert into shared_list_members(list_id,user_id,role) values($1,$2,$3) on conflict(list_id,user_id) do update set role=excluded.role`, listID, memberID, role)
	return err
}

func (s *Service) Items(ctx context.Context, userID, listID string) ([]Item, error) {
	var allowed bool
	err := s.db.QueryRowContext(ctx, `select exists(select 1 from shared_lists l where l.id=$2 and (l.owner_id=$1 or l.visibility='public' or (l.visibility='friends' and exists(select 1 from friendships f where f.status='accepted' and ((f.requester_id=$1 and f.addressee_id=l.owner_id) or (f.addressee_id=$1 and f.requester_id=l.owner_id)))) or exists(select 1 from shared_list_members m where m.list_id=l.id and m.user_id=$1)))`, userID, listID).Scan(&allowed)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrForbidden
	}
	rows, err := s.db.QueryContext(ctx, `select id,added_by,tmdb_id,media_type,title,coalesce(poster_url,''),created_at from shared_list_items where list_id=$1 order by created_at desc`, listID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Item
	for rows.Next() {
		var v Item
		if err := rows.Scan(&v.ID, &v.AddedBy, &v.TMDBID, &v.MediaType, &v.Title, &v.PosterURL, &v.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *Service) PublicList(ctx context.Context, token string) (List, []Item, error) {
	var list List
	err := s.db.QueryRowContext(ctx, `select id,owner_id,name,visibility,share_token,created_at,(select count(*) from shared_list_items where list_id=l.id),(select count(*) from shared_list_members where list_id=l.id) from shared_lists l where share_token=$1 and visibility='public'`, token).Scan(&list.ID, &list.OwnerID, &list.Name, &list.Visibility, &list.ShareToken, &list.CreatedAt, &list.ItemCount, &list.MemberCount)
	if err != nil {
		return List{}, nil, err
	}
	rows, err := s.db.QueryContext(ctx, `select id,added_by,tmdb_id,media_type,title,coalesce(poster_url,''),created_at from shared_list_items where list_id=$1 order by created_at desc`, list.ID)
	if err != nil {
		return List{}, nil, err
	}
	defer rows.Close()
	var items []Item
	for rows.Next() {
		var v Item
		if err := rows.Scan(&v.ID, &v.AddedBy, &v.TMDBID, &v.MediaType, &v.Title, &v.PosterURL, &v.CreatedAt); err != nil {
			return List{}, nil, err
		}
		items = append(items, v)
	}
	return list, items, rows.Err()
}

type Activity struct {
	Type      string    `json:"type"`
	ActorID   string    `json:"actorId"`
	ActorName string    `json:"actorName"`
	Title     string    `json:"title"`
	MediaType string    `json:"mediaType"`
	TMDBID    int       `json:"tmdbId"`
	Rating    *int      `json:"rating,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

func (s *Service) Activity(ctx context.Context, userID string, limit int) ([]Activity, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx, `with friend_ids as (select case when requester_id=$1 then addressee_id else requester_id end id from friendships where status='accepted' and (requester_id=$1 or addressee_id=$1)), events as (select case when st.user_rating is not null then 'rating' else 'save' end type,st.user_id actor_id,st.title,st.tmdb_id,st.media_type,st.user_rating rating,st.updated_at created_at from saved_titles st where st.user_id in(select id from friend_ids) union all select 'recommendation',fr.sender_id,fr.title,fr.tmdb_id,fr.media_type,null,fr.created_at from friend_recommendations fr where fr.recipient_id=$1 union all select 'friend_accepted',case when f.requester_id=$1 then f.addressee_id else f.requester_id end,'',0,'social',null,f.responded_at from friendships f where f.status='accepted' and (f.requester_id=$1 or f.addressee_id=$1)) select e.type,e.actor_id,coalesce(u.username,u.email),e.title,e.tmdb_id,e.media_type,e.rating,e.created_at from events e join users u on u.id=e.actor_id order by e.created_at desc limit $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Activity
	for rows.Next() {
		var v Activity
		var rating sql.NullInt32
		if err := rows.Scan(&v.Type, &v.ActorID, &v.ActorName, &v.Title, &v.TMDBID, &v.MediaType, &rating, &v.CreatedAt); err != nil {
			return nil, err
		}
		if rating.Valid {
			x := int(rating.Int32)
			v.Rating = &x
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
