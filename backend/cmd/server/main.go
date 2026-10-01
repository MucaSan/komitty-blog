package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"strings"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	blogv1 "github.com/MucaSan/komitty-blog/backend/gen/blog/v1"
	"github.com/MucaSan/komitty-blog/backend/internal/config"
	"github.com/MucaSan/komitty-blog/backend/internal/db"
	"github.com/MucaSan/komitty-blog/backend/internal/service"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	svc := service.New(pool, cfg.JWTSecret)

	// --- gRPC server (native gRPC clients) ---
	grpcServer := grpc.NewServer()
	blogv1.RegisterBlogServiceServer(grpcServer, svc)

	lis, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		log.Fatalf("failed to listen on gRPC port: %v", err)
	}
	go func() {
		log.Printf("gRPC server listening on :%s", cfg.GRPCPort)
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("gRPC server failed: %v", err)
		}
	}()

	// --- HTTP gateway (REST/JSON for the browser) ---
	mux := runtime.NewServeMux(
		runtime.WithIncomingHeaderMatcher(forwardAuthorization),
	)
	opts := []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}
	if err := blogv1.RegisterBlogServiceHandlerFromEndpoint(ctx, mux, "localhost:"+cfg.GRPCPort, opts); err != nil {
		log.Fatalf("failed to register gateway: %v", err)
	}

	httpServer := &http.Server{
		Addr:    ":" + cfg.HTTPPort,
		Handler: cors(mux),
	}

	log.Printf("HTTP gateway listening on :%s", cfg.HTTPPort)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("HTTP server failed: %v", err)
	}
}

// forwardAuthorization makes the HTTP Authorization header available to the
// gRPC handlers as the "authorization" metadata key.
func forwardAuthorization(key string) (string, bool) {
	if strings.EqualFold(key, "Authorization") {
		return "authorization", true
	}
	return runtime.DefaultHeaderMatcher(key)
}

// cors allows the frontend dev server (localhost:3000) to call the gateway.
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Grpc-Metadata-Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
