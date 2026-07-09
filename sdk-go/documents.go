package fugu

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"
)

// DocumentsService manages documents (upload, list, get, delete, retry).
type DocumentsService struct {
	http *httpClient
}

type listDocumentsResponse struct {
	Documents []Document `json:"documents"`
}

// List returns documents for the caller's organization.
func (s *DocumentsService) List(ctx context.Context, opts ListDocumentsOptions) ([]Document, error) {
	q := url.Values{}
	if opts.Limit > 0 {
		q.Set("limit", strconv.Itoa(opts.Limit))
	}
	if opts.Offset > 0 {
		q.Set("offset", strconv.Itoa(opts.Offset))
	}

	var out listDocumentsResponse
	if err := s.http.doJSON(ctx, "GET", "/documents", q, nil, &out); err != nil {
		return nil, fmt.Errorf("fugu: list documents: %w", err)
	}
	return out.Documents, nil
}

type getDocumentResponse struct {
	Document Document `json:"document"`
}

// Get fetches a single document by ID.
func (s *DocumentsService) Get(ctx context.Context, id string) (*Document, error) {
	var out getDocumentResponse
	if err := s.http.doJSON(ctx, "GET", "/documents/"+url.PathEscape(id), nil, nil, &out); err != nil {
		return nil, fmt.Errorf("fugu: get document: %w", err)
	}
	return &out.Document, nil
}

// UploadInput describes a file to upload.
type UploadInput struct {
	// Filename including extension, used for type detection server-side.
	Filename string
	// Reader supplying the file's bytes.
	Reader io.Reader
}

// Upload uploads a document (multipart/form-data, field name "file"). 50MB limit.
func (s *DocumentsService) Upload(ctx context.Context, input UploadInput) (*UploadResponse, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, err := writer.CreateFormFile("file", input.Filename)
	if err != nil {
		return nil, fmt.Errorf("fugu: building upload form: %w", err)
	}
	if _, err := io.Copy(part, input.Reader); err != nil {
		return nil, fmt.Errorf("fugu: reading upload data: %w", err)
	}
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("fugu: closing upload form: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.http.baseURL+"/documents", &buf)
	if err != nil {
		return nil, fmt.Errorf("fugu: building upload request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.http.apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	res, err := s.http.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fugu: upload request failed: %w", err)
	}
	defer res.Body.Close()

	var out UploadResponse
	if err := decodeJSONResponse(res, &out); err != nil {
		return nil, fmt.Errorf("fugu: upload document: %w", err)
	}
	return &out, nil
}

// Delete removes a document by ID.
func (s *DocumentsService) Delete(ctx context.Context, id string) error {
	if err := s.http.doJSON(ctx, "DELETE", "/documents/"+url.PathEscape(id), nil, nil, nil); err != nil {
		return fmt.Errorf("fugu: delete document: %w", err)
	}
	return nil
}

type retryResponse struct {
	Status string `json:"status"`
}

// Retry re-queues a failed or pending document for ingestion.
func (s *DocumentsService) Retry(ctx context.Context, id string) (string, error) {
	var out retryResponse
	if err := s.http.doJSON(ctx, "POST", "/documents/"+url.PathEscape(id)+"/retry", nil, nil, &out); err != nil {
		return "", fmt.Errorf("fugu: retry document: %w", err)
	}
	return out.Status, nil
}
