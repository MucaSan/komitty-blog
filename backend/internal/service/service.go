package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	blogv1 "github.com/MucaSan/komitty-blog/backend/gen/blog/v1"
	"github.com/MucaSan/komitty-blog/backend/internal/auth"
)

// Service implements the BlogService gRPC API.
type Service struct {
	blogv1.UnimplementedBlogServiceServer

	pool      *pgxpool.Pool
	jwtSecret string
}

// New constructs a BlogService backed by the given connection pool.
func New(pool *pgxpool.Pool, jwtSecret string) *Service {
	return &Service{pool: pool, jwtSecret: jwtSecret}
}

// CreateUser registers a new account.
func (s *Service) CreateUser(ctx context.Context, req *blogv1.CreateUserRequest) (*blogv1.CreateUserResponse, error) {
	username := strings.TrimSpace(req.GetUsername())
	if err := validateUsername(username); err != nil {
		return nil, err
	}
	if len(req.GetPassword()) < 8 {
		return nil, status.Error(codes.InvalidArgument, "password must be at least 8 characters")
	}

	hash, err := auth.HashPassword(req.GetPassword())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to hash password: %v", err)
	}

	id := uuid.NewString()
	var createdAt time.Time
	err = s.pool.QueryRow(ctx,
		`INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3) RETURNING created_at`,
		id, username, hash,
	).Scan(&createdAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique_violation
			return nil, status.Error(codes.AlreadyExists, "username is already taken")
		}
		return nil, status.Errorf(codes.Internal, "failed to create user: %v", err)
	}

	token, err := auth.SignToken(s.jwtSecret, id, username)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to issue token: %v", err)
	}

	return &blogv1.CreateUserResponse{
		User:  &blogv1.User{Id: id, Username: username, CreatedAt: createdAt.UTC().Format(time.RFC3339)},
		Token: token,
	}, nil
}

// Login authenticates an existing account.
func (s *Service) Login(ctx context.Context, req *blogv1.LoginRequest) (*blogv1.LoginResponse, error) {
	username := strings.TrimSpace(req.GetUsername())

	var (
		id           string
		passwordHash string
		createdAt    time.Time
	)
	err := s.pool.QueryRow(ctx,
		`SELECT id, password_hash, created_at FROM users WHERE username = $1`, username,
	).Scan(&id, &passwordHash, &createdAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, status.Error(codes.Unauthenticated, "invalid username or password")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch user: %v", err)
	}

	if !auth.CheckPassword(passwordHash, req.GetPassword()) {
		return nil, status.Error(codes.Unauthenticated, "invalid username or password")
	}

	token, err := auth.SignToken(s.jwtSecret, id, username)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to issue token: %v", err)
	}

	return &blogv1.LoginResponse{
		User:  &blogv1.User{Id: id, Username: username, CreatedAt: createdAt.UTC().Format(time.RFC3339)},
		Token: token,
	}, nil
}

// CreatePost publishes a new post for the authenticated user.
func (s *Service) CreatePost(ctx context.Context, req *blogv1.CreatePostRequest) (*blogv1.CreatePostResponse, error) {
	claims, err := s.authenticate(ctx)
	if err != nil {
		return nil, err
	}

	title := strings.TrimSpace(req.GetTitle())
	content := req.GetContent()
	if title == "" {
		return nil, status.Error(codes.InvalidArgument, "title is required")
	}
	if strings.TrimSpace(content) == "" {
		return nil, status.Error(codes.InvalidArgument, "content is required")
	}

	id := uuid.NewString()
	var createdAt time.Time
	err = s.pool.QueryRow(ctx,
		`INSERT INTO posts (id, user_id, title, content) VALUES ($1, $2, $3, $4) RETURNING created_at`,
		id, claims.Subject, title, content,
	).Scan(&createdAt)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create post: %v", err)
	}

	return &blogv1.CreatePostResponse{
		Post: &blogv1.Post{
			Id:        id,
			UserId:    claims.Subject,
			Username:  claims.Username,
			Title:     title,
			Content:   content,
			CreatedAt: createdAt.UTC().Format(time.RFC3339),
		},
	}, nil
}

// ListPosts returns all posts, newest first.
func (s *Service) ListPosts(ctx context.Context, _ *blogv1.ListPostsRequest) (*blogv1.ListPostsResponse, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT p.id, p.user_id, u.username, p.title, p.content, p.created_at
		FROM posts p
		JOIN users u ON u.id = p.user_id
		ORDER BY p.created_at DESC
	`)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list posts: %v", err)
	}
	defer rows.Close()

	posts, err := scanPosts(rows)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to read posts: %v", err)
	}

	return &blogv1.ListPostsResponse{Posts: posts}, nil
}

// ListUserPosts returns a single user's posts, newest first.
func (s *Service) ListUserPosts(ctx context.Context, req *blogv1.ListUserPostsRequest) (*blogv1.ListUserPostsResponse, error) {
	username := strings.TrimSpace(req.GetUsername())
	if username == "" {
		return nil, status.Error(codes.InvalidArgument, "username is required")
	}

	rows, err := s.pool.Query(ctx, `
		SELECT p.id, p.user_id, u.username, p.title, p.content, p.created_at
		FROM posts p
		JOIN users u ON u.id = p.user_id
		WHERE u.username = $1
		ORDER BY p.created_at DESC
	`, username)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list user posts: %v", err)
	}
	defer rows.Close()

	posts, err := scanPosts(rows)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to read posts: %v", err)
	}

	return &blogv1.ListUserPostsResponse{Posts: posts}, nil
}

// authenticate extracts and validates the bearer token from gRPC metadata.
// grpc-gateway forwards the HTTP Authorization header into this metadata.
func (s *Service) authenticate(ctx context.Context) (*auth.Claims, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "missing authorization metadata")
	}

	values := md.Get("authorization")
	if len(values) == 0 {
		return nil, status.Error(codes.Unauthenticated, "missing authorization header")
	}

	header := values[0]
	const prefix = "Bearer "
	if len(header) < len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		return nil, status.Error(codes.Unauthenticated, "invalid authorization header")
	}

	claims, err := auth.ParseToken(s.jwtSecret, strings.TrimSpace(header[len(prefix):]))
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "invalid or expired token")
	}
	return claims, nil
}

func scanPosts(rows pgx.Rows) ([]*blogv1.Post, error) {
	var posts []*blogv1.Post
	for rows.Next() {
		var (
			p         blogv1.Post
			createdAt time.Time
		)
		if err := rows.Scan(&p.Id, &p.UserId, &p.Username, &p.Title, &p.Content, &createdAt); err != nil {
			return nil, err
		}
		p.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		posts = append(posts, &p)
	}
	return posts, rows.Err()
}

func validateUsername(username string) error {
	if username == "" {
		return status.Error(codes.InvalidArgument, "username is required")
	}
	if len(username) < 3 {
		return status.Error(codes.InvalidArgument, "username must be at least 3 characters")
	}
	if len(username) > 30 {
		return status.Error(codes.InvalidArgument, "username must be at most 30 characters")
	}
	return nil
}
