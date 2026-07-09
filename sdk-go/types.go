package fugu

import "fmt"

// QueryStrategy selects the routing strategy for a query.
type QueryStrategy string

const (
	StrategyVectorOnly QueryStrategy = "vector_only"
	StrategyGraphOnly  QueryStrategy = "graph_only"
	StrategyHybrid     QueryStrategy = "hybrid"
	StrategyAuto       QueryStrategy = "auto"
)

// QuerySource is a single retrieved passage backing an answer.
type QuerySource struct {
	Content    string                 `json:"content"`
	Source     string                 `json:"source"` // "vector" | "graph"
	Score      float64                `json:"score"`
	DocumentID string                 `json:"document_id,omitempty"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

// Quota describes the organization's current usage against its plan limit.
type Quota struct {
	Used    int     `json:"used"`
	Limit   int     `json:"limit"`
	Percent float64 `json:"percent"`
	Warn    bool    `json:"warn"`
}

// QueryResponse is the full (non-streaming) result of a query.
type QueryResponse struct {
	Answer         string                 `json:"answer"`
	Citations      []string               `json:"citations"`
	AnswerDegraded bool                   `json:"answer_degraded"`
	Results        []QuerySource          `json:"results"`
	Explain        map[string]interface{} `json:"explain"`
	Quota          Quota                  `json:"quota"`
}

// QueryOptions configures an optional strategy/top_k override for a query.
type QueryOptions struct {
	Strategy QueryStrategy
	TopK     int
}

// StreamEventType identifies the kind of SSE event emitted by the streaming
// query endpoint.
type StreamEventType string

const (
	StreamEventMeta  StreamEventType = "meta"
	StreamEventDelta StreamEventType = "delta"
	StreamEventDone  StreamEventType = "done"
	StreamEventError StreamEventType = "error"
)

// StreamEvent is a single Server-Sent Event from POST /api/queries/stream.
// Only the fields relevant to Type are populated.
type StreamEvent struct {
	Type StreamEventType `json:"type"`

	// meta
	Results []QuerySource          `json:"results,omitempty"`
	Explain map[string]interface{} `json:"explain,omitempty"`
	Quota   *Quota                 `json:"quota,omitempty"`

	// delta
	Text string `json:"text,omitempty"`

	// done
	Citations      []string `json:"citations,omitempty"`
	AnswerDegraded bool     `json:"answer_degraded,omitempty"`

	// error
	Message string `json:"message,omitempty"`
}

// DocumentStatus is the ingestion lifecycle state of a document.
type DocumentStatus string

const (
	DocumentPending    DocumentStatus = "pending"
	DocumentProcessing DocumentStatus = "processing"
	DocumentReady      DocumentStatus = "ready"
	DocumentFailed     DocumentStatus = "failed"
)

// Document represents a document record.
//
// FileSize is typed as a JSON-number-or-string decoder because Postgres
// BIGINT columns are serialized as JSON strings by the backend's driver
// (pg's default int8 handling) to avoid float64 precision loss — the
// dashboard's own TypeScript client treats it as a string for the same
// reason.
type Document struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	FileType  string         `json:"file_type"`
	FileSize  FlexibleInt64  `json:"file_size"`
	Status    DocumentStatus `json:"status"`
	CreatedAt string         `json:"created_at"`
	UpdatedAt string         `json:"updated_at,omitempty"`
}

// FlexibleInt64 unmarshals a JSON number or a JSON string containing a
// number into an int64. Some backend fields (e.g. Postgres BIGINT columns)
// are serialized as strings to avoid precision loss.
type FlexibleInt64 int64

// UnmarshalJSON implements json.Unmarshaler.
func (n *FlexibleInt64) UnmarshalJSON(data []byte) error {
	s := string(data)
	if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
		s = s[1 : len(s)-1]
	}
	if s == "" || s == "null" {
		*n = 0
		return nil
	}
	var v int64
	if _, err := fmt.Sscanf(s, "%d", &v); err != nil {
		return fmt.Errorf("fugu: parsing file_size %q: %w", s, err)
	}
	*n = FlexibleInt64(v)
	return nil
}

// UploadResponse is returned after a successful document upload.
type UploadResponse struct {
	DocumentID string `json:"document_id"`
	Status     string `json:"status"`
}

// ListDocumentsOptions paginates the document list endpoint.
type ListDocumentsOptions struct {
	Limit  int
	Offset int
}

// LLMCredentialProvider identifies a supported BYOK provider.
type LLMCredentialProvider string

const (
	ProviderAnthropic  LLMCredentialProvider = "anthropic"
	ProviderOpenAI     LLMCredentialProvider = "openai"
	ProviderGemini     LLMCredentialProvider = "gemini"
	ProviderOpenRouter LLMCredentialProvider = "openrouter"
)

// Credential is the display-safe view of an organization's BYOK credential.
type Credential struct {
	Provider       LLMCredentialProvider `json:"provider"`
	Model          string                `json:"model"`
	KeyLastFour    string                `json:"keyLastFour"`
	LastVerifiedAt *string               `json:"lastVerifiedAt"`
}

// CredentialModel is a model offered by a provider's catalog.
type CredentialModel struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Free  bool   `json:"free"`
}

// SaveCredentialInput is the payload to create or replace a BYOK credential.
type SaveCredentialInput struct {
	Provider LLMCredentialProvider `json:"provider"`
	Model    string                `json:"model"`
	APIKey   string                `json:"apiKey"`
}
