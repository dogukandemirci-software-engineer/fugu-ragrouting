package fugu

import (
	"context"
	"fmt"
	"net/url"
)

// CredentialsService manages the organization's BYOK LLM credential.
type CredentialsService struct {
	http *httpClient
}

type getCredentialResponse struct {
	Credential *Credential `json:"credential"`
}

// Get returns the organization's configured BYOK credential, or nil if none is set.
func (s *CredentialsService) Get(ctx context.Context) (*Credential, error) {
	var out getCredentialResponse
	if err := s.http.doJSON(ctx, "GET", "/organization/llm-credential", nil, nil, &out); err != nil {
		return nil, fmt.Errorf("fugu: get credential: %w", err)
	}
	return out.Credential, nil
}

type listModelsResponse struct {
	Models []CredentialModel `json:"models"`
}

// ListModels lists available models for a provider, including free-tier availability.
func (s *CredentialsService) ListModels(ctx context.Context, provider LLMCredentialProvider) ([]CredentialModel, error) {
	q := url.Values{"provider": {string(provider)}}
	var out listModelsResponse
	if err := s.http.doJSON(ctx, "GET", "/organization/llm-credential/models", q, nil, &out); err != nil {
		return nil, fmt.Errorf("fugu: list models: %w", err)
	}
	return out.Models, nil
}

type saveCredentialResponse struct {
	Credential Credential `json:"credential"`
}

// Save creates or replaces the organization's BYOK credential. The server
// validates the key with a real test call before persisting it.
func (s *CredentialsService) Save(ctx context.Context, input SaveCredentialInput) (*Credential, error) {
	var out saveCredentialResponse
	if err := s.http.doJSON(ctx, "PUT", "/organization/llm-credential", nil, input, &out); err != nil {
		return nil, fmt.Errorf("fugu: save credential: %w", err)
	}
	return &out.Credential, nil
}

// Remove deletes the organization's BYOK credential.
func (s *CredentialsService) Remove(ctx context.Context) error {
	if err := s.http.doJSON(ctx, "DELETE", "/organization/llm-credential", nil, nil, nil); err != nil {
		return fmt.Errorf("fugu: remove credential: %w", err)
	}
	return nil
}
