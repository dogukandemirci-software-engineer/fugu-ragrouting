package fugu

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type httpClient struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

func (c *httpClient) buildURL(path string, query url.Values) string {
	u := c.baseURL + path
	if len(query) > 0 {
		u += "?" + query.Encode()
	}
	return u
}

func (c *httpClient) newRequest(ctx context.Context, method, path string, query url.Values, body interface{}) (*http.Request, error) {
	var reader io.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("fugu: encoding request body: %w", err)
		}
		reader = bytes.NewReader(buf)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.buildURL(path, query), reader)
	if err != nil {
		return nil, fmt.Errorf("fugu: building request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return req, nil
}

// doJSON performs a request and decodes a JSON response body into out (which
// may be nil for responses with no body, e.g. 204 No Content).
func (c *httpClient) doJSON(ctx context.Context, method, path string, query url.Values, body interface{}, out interface{}) error {
	req, err := c.newRequest(ctx, method, path, query, body)
	if err != nil {
		return err
	}

	res, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("fugu: request failed: %w", err)
	}
	defer res.Body.Close()

	return decodeJSONResponse(res, out)
}

func decodeJSONResponse(res *http.Response, out interface{}) error {
	if res.StatusCode == http.StatusNoContent {
		return nil
	}

	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return fmt.Errorf("fugu: reading response body: %w", err)
	}

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		var errBody apiErrorBody
		_ = json.Unmarshal(raw, &errBody)
		return errorFromResponse(res.StatusCode, &errBody)
	}

	if out == nil || len(bytes.TrimSpace(raw)) == 0 {
		return nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("fugu: decoding response body: %w", err)
	}
	return nil
}

// doStream issues a request and returns the raw *http.Response for the
// caller to read as an SSE stream. The caller is responsible for closing
// the response body.
func (c *httpClient) doStream(ctx context.Context, method, path string, body interface{}) (*http.Response, error) {
	req, err := c.newRequest(ctx, method, path, nil, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "text/event-stream")

	res, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fugu: stream request failed: %w", err)
	}

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		defer res.Body.Close()
		raw, _ := io.ReadAll(res.Body)
		var errBody apiErrorBody
		_ = json.Unmarshal(raw, &errBody)
		return nil, errorFromResponse(res.StatusCode, &errBody)
	}

	return res, nil
}
