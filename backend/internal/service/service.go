package service

import (
	"context"
	"encoding/json"
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

// CreateUser registers a new account. Only the prime user may create accounts.
func (s *Service) CreateUser(ctx context.Context, req *blogv1.CreateUserRequest) (*blogv1.CreateUserResponse, error) {
	u, err := s.requireUser(ctx)
	if err != nil {
		return nil, err
	}
	if !u.isPrime {
		return nil, status.Error(codes.PermissionDenied, "only the prime user can create accounts")
	}

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
		isPrime      bool
	)
	err := s.pool.QueryRow(ctx,
		`SELECT id, password_hash, created_at, is_prime FROM users WHERE username = $1`, username,
	).Scan(&id, &passwordHash, &createdAt, &isPrime)
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
		User:  &blogv1.User{Id: id, Username: username, CreatedAt: createdAt.UTC().Format(time.RFC3339), IsPrime: isPrime},
		Token: token,
	}, nil
}

// CreatePost publishes a new post for the authenticated user.
func (s *Service) CreatePost(ctx context.Context, req *blogv1.CreatePostRequest) (*blogv1.CreatePostResponse, error) {
	u, err := s.requireUser(ctx)
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
		id, u.id, title, content,
	).Scan(&createdAt)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create post: %v", err)
	}

	return &blogv1.CreatePostResponse{
		Post: &blogv1.Post{
			Id:        id,
			UserId:    u.id,
			Username:  u.username,
			Title:     title,
			Content:   content,
			CreatedAt: createdAt.UTC().Format(time.RFC3339),
		},
	}, nil
}

// UploadImage stores an uploaded image and returns its public URL.
func (s *Service) UploadImage(ctx context.Context, req *blogv1.UploadImageRequest) (*blogv1.UploadImageResponse, error) {
	u, err := s.requireUser(ctx)
	if err != nil {
		return nil, err
	}

	contentType := req.GetContentType()
	if !isAllowedImageType(contentType) {
		return nil, status.Error(codes.InvalidArgument, "unsupported image type")
	}

	data := req.GetData()
	if len(data) == 0 {
		return nil, status.Error(codes.InvalidArgument, "image data is empty")
	}
	const maxImageSize = 8 << 20 // 8 MB
	if len(data) > maxImageSize {
		return nil, status.Error(codes.InvalidArgument, "image is too large (max 8 MB)")
	}

	id := uuid.NewString()
	_, err = s.pool.Exec(ctx,
		`INSERT INTO images (id, user_id, content_type, size, data) VALUES ($1, $2, $3, $4, $5)`,
		id, u.id, contentType, len(data), data,
	)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to store image: %v", err)
	}

	return &blogv1.UploadImageResponse{Id: id, Url: "/v1/images/" + id}, nil
}

// UpdatePost edits an existing post. Only the owner may update it.
func (s *Service) UpdatePost(ctx context.Context, req *blogv1.UpdatePostRequest) (*blogv1.UpdatePostResponse, error) {
	u, err := s.requireUser(ctx)
	if err != nil {
		return nil, err
	}

	id := req.GetId()
	if id == "" {
		return nil, status.Error(codes.InvalidArgument, "post id is required")
	}

	var ownerID string
	err = s.pool.QueryRow(ctx, `SELECT user_id FROM posts WHERE id = $1`, id).Scan(&ownerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, status.Error(codes.NotFound, "post not found")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch post: %v", err)
	}
	if ownerID != u.id {
		return nil, status.Error(codes.PermissionDenied, "you can only edit your own posts")
	}

	title := strings.TrimSpace(req.GetTitle())
	content := req.GetContent()
	if title == "" {
		return nil, status.Error(codes.InvalidArgument, "title is required")
	}
	if strings.TrimSpace(content) == "" {
		return nil, status.Error(codes.InvalidArgument, "content is required")
	}

	var createdAt time.Time
	err = s.pool.QueryRow(ctx,
		`UPDATE posts SET title = $1, content = $2 WHERE id = $3 RETURNING created_at`,
		title, content, id,
	).Scan(&createdAt)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update post: %v", err)
	}

	return &blogv1.UpdatePostResponse{
		Post: &blogv1.Post{
			Id:        id,
			UserId:    u.id,
			Username:  u.username,
			Title:     title,
			Content:   content,
			CreatedAt: createdAt.UTC().Format(time.RFC3339),
		},
	}, nil
}

// GetPost returns a single post by id. Post details are public, so no
// authentication is required.
func (s *Service) GetPost(ctx context.Context, req *blogv1.GetPostRequest) (*blogv1.GetPostResponse, error) {
	id := req.GetId()
	if id == "" {
		return nil, status.Error(codes.InvalidArgument, "post id is required")
	}

	var (
		p         blogv1.Post
		createdAt time.Time
	)
	err := s.pool.QueryRow(ctx, `
		SELECT p.id, p.user_id, u.username, p.title, p.content, p.created_at
		FROM posts p
		JOIN users u ON u.id = p.user_id
		WHERE p.id = $1
	`, id).Scan(&p.Id, &p.UserId, &p.Username, &p.Title, &p.Content, &createdAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, status.Error(codes.NotFound, "post not found")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch post: %v", err)
	}
	p.CreatedAt = createdAt.UTC().Format(time.RFC3339)

	return &blogv1.GetPostResponse{Post: &p}, nil
}

// DeletePost removes an existing post. Only the owner may delete it.
func (s *Service) DeletePost(ctx context.Context, req *blogv1.DeletePostRequest) (*blogv1.DeletePostResponse, error) {
	u, err := s.requireUser(ctx)
	if err != nil {
		return nil, err
	}

	id := req.GetId()
	if id == "" {
		return nil, status.Error(codes.InvalidArgument, "post id is required")
	}

	var ownerID string
	err = s.pool.QueryRow(ctx, `SELECT user_id FROM posts WHERE id = $1`, id).Scan(&ownerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, status.Error(codes.NotFound, "post not found")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch post: %v", err)
	}
	if ownerID != u.id {
		return nil, status.Error(codes.PermissionDenied, "you can only delete your own posts")
	}

	if _, err = s.pool.Exec(ctx, `DELETE FROM posts WHERE id = $1`, id); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete post: %v", err)
	}

	return &blogv1.DeletePostResponse{}, nil
}

// postsPerPage is the fixed page size used by the post feeds. The requirement
// is "10 publications per page".
const postsPerPage = 10

// paginate normalizes a 1-based page number and derives the SQL offset and the
// total number of pages for the given total count.
func paginate(reqPage, total int32) (page, offset, totalPages int32) {
	if reqPage < 1 {
		page = 1
	} else {
		page = reqPage
	}
	offset = (page - 1) * postsPerPage
	if total <= 0 {
		totalPages = 0
	} else {
		totalPages = (total + postsPerPage - 1) / postsPerPage
	}
	return page, offset, totalPages
}

// ListPosts returns posts newest first, paginated 10 per page.
func (s *Service) ListPosts(ctx context.Context, req *blogv1.ListPostsRequest) (*blogv1.ListPostsResponse, error) {
	var total int32
	if err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM posts`).Scan(&total); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to count posts: %v", err)
	}
	page, offset, totalPages := paginate(req.GetPage(), total)

	rows, err := s.pool.Query(ctx, `
		SELECT p.id, p.user_id, u.username, p.title, p.content, p.created_at
		FROM posts p
		JOIN users u ON u.id = p.user_id
		ORDER BY p.created_at DESC
		LIMIT $1 OFFSET $2
	`, postsPerPage, offset)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list posts: %v", err)
	}
	defer rows.Close()

	posts, err := scanPosts(rows)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to read posts: %v", err)
	}

	return &blogv1.ListPostsResponse{Posts: posts, Total: total, Page: page, TotalPages: totalPages}, nil
}

// ListUserPosts returns a single user's posts newest first, paginated 10 per page.
func (s *Service) ListUserPosts(ctx context.Context, req *blogv1.ListUserPostsRequest) (*blogv1.ListUserPostsResponse, error) {
	username := strings.TrimSpace(req.GetUsername())
	if username == "" {
		return nil, status.Error(codes.InvalidArgument, "username is required")
	}

	var total int32
	if err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM posts p
		JOIN users u ON u.id = p.user_id
		WHERE u.username = $1
	`, username).Scan(&total); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to count user posts: %v", err)
	}
	page, offset, totalPages := paginate(req.GetPage(), total)

	rows, err := s.pool.Query(ctx, `
		SELECT p.id, p.user_id, u.username, p.title, p.content, p.created_at
		FROM posts p
		JOIN users u ON u.id = p.user_id
		WHERE u.username = $1
		ORDER BY p.created_at DESC
		LIMIT $2 OFFSET $3
	`, username, postsPerPage, offset)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list user posts: %v", err)
	}
	defer rows.Close()

	posts, err := scanPosts(rows)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to read posts: %v", err)
	}

	return &blogv1.ListUserPostsResponse{Posts: posts, Total: total, Page: page, TotalPages: totalPages}, nil
}

// Allowed values for the visual settings document. The document is stored as a
// single JSONB value in the `settings` table and replaced in full on every save.
const (
	themeDark  = "dark"
	themeWhite = "white"

	toolbarTop  = "top"
	toolbarDown = "down"
	toolbarDrag = "drag"
)

// settingsDoc is the JSON shape stored in the settings.data JSONB column.
type settingsDoc struct {
	Theme   string `json:"theme"`
	Toolbar string `json:"toolbar"`
}

func defaultSettingsDoc() settingsDoc {
	return settingsDoc{Theme: themeDark, Toolbar: toolbarTop}
}

// GetSettings returns the authenticated user's visual settings. When the user
// has not saved any settings yet, the defaults (dark theme, top toolbar) are
// returned without persisting a row.
func (s *Service) GetSettings(ctx context.Context, _ *blogv1.GetSettingsRequest) (*blogv1.GetSettingsResponse, error) {
	u, err := s.requireUser(ctx)
	if err != nil {
		return nil, err
	}

	var data []byte
	err = s.pool.QueryRow(ctx, `SELECT data FROM settings WHERE user_id = $1`, u.id).Scan(&data)
	if errors.Is(err, pgx.ErrNoRows) {
		doc := defaultSettingsDoc()
		return &blogv1.GetSettingsResponse{Settings: settingsToProto(doc)}, nil
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to load settings: %v", err)
	}

	doc, err := parseSettingsDoc(data)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to parse settings: %v", err)
	}

	return &blogv1.GetSettingsResponse{Settings: settingsToProto(doc)}, nil
}

// UpdateSettings validates and saves the authenticated user's visual settings.
// The whole document is written to the JSONB column (upsert by user id).
func (s *Service) UpdateSettings(ctx context.Context, req *blogv1.UpdateSettingsRequest) (*blogv1.UpdateSettingsResponse, error) {
	u, err := s.requireUser(ctx)
	if err != nil {
		return nil, err
	}

	doc, err := validateSettings(req.GetSettings())
	if err != nil {
		return nil, err
	}

	data, err := json.Marshal(doc)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to serialize settings: %v", err)
	}

	_, err = s.pool.Exec(ctx, `
		INSERT INTO settings (user_id, data) VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
	`, u.id, data)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to save settings: %v", err)
	}

	return &blogv1.UpdateSettingsResponse{Settings: settingsToProto(doc)}, nil
}

// validateSettings rejects missing or unsupported settings values. It returns
// the canonical settings document that should be stored.
func validateSettings(s *blogv1.Settings) (settingsDoc, error) {
	if s == nil {
		return settingsDoc{}, status.Error(codes.InvalidArgument, "settings is required")
	}

	theme := s.GetTheme()
	if theme != themeDark && theme != themeWhite {
		return settingsDoc{}, status.Error(codes.InvalidArgument, `theme must be "dark" or "white"`)
	}

	toolbar := s.GetToolbar()
	if toolbar != toolbarTop && toolbar != toolbarDown && toolbar != toolbarDrag {
		return settingsDoc{}, status.Error(codes.InvalidArgument, `toolbar must be "top", "down" or "drag"`)
	}

	return settingsDoc{Theme: theme, Toolbar: toolbar}, nil
}

func parseSettingsDoc(data []byte) (settingsDoc, error) {
	doc := defaultSettingsDoc()
	if err := json.Unmarshal(data, &doc); err != nil {
		return settingsDoc{}, err
	}
	// Guard against partial/legacy documents.
	if doc.Theme != themeDark && doc.Theme != themeWhite {
		doc.Theme = themeDark
	}
	if doc.Toolbar != toolbarTop && doc.Toolbar != toolbarDown && doc.Toolbar != toolbarDrag {
		doc.Toolbar = toolbarTop
	}
	return doc, nil
}

func settingsToProto(doc settingsDoc) *blogv1.Settings {
	return &blogv1.Settings{Theme: doc.Theme, Toolbar: doc.Toolbar}
}

// CreateComment adds a comment (or reply) to a post.
func (s *Service) CreateComment(ctx context.Context, req *blogv1.CreateCommentRequest) (*blogv1.CreateCommentResponse, error) {
	u, err := s.requireUser(ctx)
	if err != nil {
		return nil, err
	}

	postID := strings.TrimSpace(req.GetPostId())
	if postID == "" {
		return nil, status.Error(codes.InvalidArgument, "post id is required")
	}
	content := req.GetContent()
	if strings.TrimSpace(content) == "" {
		return nil, status.Error(codes.InvalidArgument, "comment content is required")
	}

	// The post must exist; the FK constraint would catch this too, but a clear
	// NotFound beats a generic internal error.
	var one int
	err = s.pool.QueryRow(ctx, `SELECT 1 FROM posts WHERE id = $1`, postID).Scan(&one)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, status.Error(codes.NotFound, "post not found")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to load post: %v", err)
	}

	parentID := strings.TrimSpace(req.GetParentId())
	var parent any
	if parentID != "" {
		var parentPostID string
		err := s.pool.QueryRow(ctx, `SELECT post_id FROM comments WHERE id = $1`, parentID).Scan(&parentPostID)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, status.Error(codes.InvalidArgument, "parent comment not found")
		}
		if err != nil {
			return nil, status.Errorf(codes.Internal, "failed to load parent comment: %v", err)
		}
		if parentPostID != postID {
			return nil, status.Error(codes.InvalidArgument, "parent comment belongs to a different post")
		}
		parent = parentID
	}

	id := uuid.NewString()
	var createdAt time.Time
	err = s.pool.QueryRow(ctx, `
		INSERT INTO comments (id, post_id, user_id, parent_id, content)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at
	`, id, postID, u.id, parent, content).Scan(&createdAt)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create comment: %v", err)
	}

	return &blogv1.CreateCommentResponse{
		Comment: &blogv1.Comment{
			Id:        id,
			PostId:    postID,
			UserId:    u.id,
			Username:  u.username,
			ParentId:  parentID,
			Content:   content,
			CreatedAt: createdAt.UTC().Format(time.RFC3339),
		},
	}, nil
}

// ListComments returns all comments of a post, oldest first. The list is flat;
// callers reconstruct the nested tree using parent_id.
func (s *Service) ListComments(ctx context.Context, req *blogv1.ListCommentsRequest) (*blogv1.ListCommentsResponse, error) {
	postID := strings.TrimSpace(req.GetPostId())
	if postID == "" {
		return nil, status.Error(codes.InvalidArgument, "post id is required")
	}

	rows, err := s.pool.Query(ctx, `
		SELECT c.id, c.post_id, c.user_id, u.username, COALESCE(c.parent_id::text, ''), c.content, c.created_at
		FROM comments c
		JOIN users u ON u.id = c.user_id
		WHERE c.post_id = $1
		ORDER BY c.created_at ASC, c.id ASC
	`, postID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list comments: %v", err)
	}
	defer rows.Close()

	var comments []*blogv1.Comment
	for rows.Next() {
		var (
			c         blogv1.Comment
			createdAt time.Time
		)
		if err := rows.Scan(&c.Id, &c.PostId, &c.UserId, &c.Username, &c.ParentId, &c.Content, &createdAt); err != nil {
			return nil, status.Errorf(codes.Internal, "failed to read comments: %v", err)
		}
		c.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		comments = append(comments, &c)
	}
	if err := rows.Err(); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to read comments: %v", err)
	}

	return &blogv1.ListCommentsResponse{Comments: comments}, nil
}

// UpdateComment edits an existing comment. Only the comment author may edit it.
func (s *Service) UpdateComment(ctx context.Context, req *blogv1.UpdateCommentRequest) (*blogv1.UpdateCommentResponse, error) {
	u, err := s.requireUser(ctx)
	if err != nil {
		return nil, err
	}

	id := strings.TrimSpace(req.GetId())
	if id == "" {
		return nil, status.Error(codes.InvalidArgument, "comment id is required")
	}
	content := req.GetContent()
	if strings.TrimSpace(content) == "" {
		return nil, status.Error(codes.InvalidArgument, "comment content is required")
	}

	var ownerID string
	err = s.pool.QueryRow(ctx, `SELECT user_id FROM comments WHERE id = $1`, id).Scan(&ownerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, status.Error(codes.NotFound, "comment not found")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to load comment: %v", err)
	}
	if ownerID != u.id {
		return nil, status.Error(codes.PermissionDenied, "you can only edit your own comments")
	}

	if _, err := s.pool.Exec(ctx, `UPDATE comments SET content = $1 WHERE id = $2`, content, id); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update comment: %v", err)
	}

	var (
		c         blogv1.Comment
		createdAt time.Time
	)
	err = s.pool.QueryRow(ctx, `
		SELECT c.id, c.post_id, c.user_id, u.username, COALESCE(c.parent_id::text, ''), c.content, c.created_at
		FROM comments c
		JOIN users u ON u.id = c.user_id
		WHERE c.id = $1
	`, id).Scan(&c.Id, &c.PostId, &c.UserId, &c.Username, &c.ParentId, &c.Content, &createdAt)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to read updated comment: %v", err)
	}
	c.CreatedAt = createdAt.UTC().Format(time.RFC3339)

	return &blogv1.UpdateCommentResponse{Comment: &c}, nil
}

type userRecord struct {
	id       string
	username string
	isPrime  bool
}

// requireUser authenticates the caller and validates, against the database,
// that they are a real, existing user. This prevents endpoints from trusting a
// JWT alone (e.g. a forged token or a deleted user).
func (s *Service) requireUser(ctx context.Context) (*userRecord, error) {
	claims, err := s.authenticate(ctx)
	if err != nil {
		return nil, err
	}

	var u userRecord
	err = s.pool.QueryRow(ctx,
		`SELECT id, username, is_prime FROM users WHERE id = $1`, claims.Subject,
	).Scan(&u.id, &u.username, &u.isPrime)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, status.Error(codes.Unauthenticated, "user no longer exists")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to load user: %v", err)
	}
	return &u, nil
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

func isAllowedImageType(contentType string) bool {
	switch contentType {
	case "image/png", "image/jpeg", "image/gif", "image/webp":
		return true
	default:
		return false
	}
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
