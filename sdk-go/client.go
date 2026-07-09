// Package fugu is the Go SDK for the FUGU routed RAG API.
//
// Example:
//
//	client := fugu.NewClient("fugu_sk_...")
//	resp, err := client.Query.Execute(ctx, "what does FUGU combine to answer questions", fugu.QueryOptions{})
package fugu

import (
	"net/http"
	"strings"
	"time"
)

const defaultBaseURL = "http://localhost:3001/api"

// Client is the entry point for the FUGU SDK. Construct one with NewClient.
type Client struct {
	Query       *QueryService
	Documents   *DocumentsService
	Credentials *CredentialsService
}

// Option configures a Client during construction.
type Option func(*clientConfig)

type clientConfig struct {
	baseURL    string
	httpClient *http.Client
}

// WithBaseURL overrides the default API base URL (http://localhost:3001/api).
func WithBaseURL(baseURL string) Option {
	return func(c *clientConfig) {
		c.baseURL = strings.TrimRight(baseURL, "/")
	}
}

// WithHTTPClient overrides the underlying *http.Client (e.g. to set a custom
// transport, proxy, or timeout).
func WithHTTPClient(hc *http.Client) Option {
	return func(c *clientConfig) {
		c.httpClient = hc
	}
}

// NewClient creates a new FUGU API client authenticated with apiKey (a
// `fugu_sk_...` API key issued from the FUGU dashboard).
func NewClient(apiKey string, opts ...Option) *Client {
	cfg := &clientConfig{
		baseURL:    defaultBaseURL,
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
	for _, opt := range opts {
		opt(cfg)
	}

	hc := &httpClient{
		apiKey:     apiKey,
		baseURL:    cfg.baseURL,
		httpClient: cfg.httpClient,
	}

	return &Client{
		Query:       &QueryService{http: hc},
		Documents:   &DocumentsService{http: hc},
		Credentials: &CredentialsService{http: hc},
	}
}
