package fugu

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// QueryService executes queries against the FUGU RAG pipeline.
type QueryService struct {
	http *httpClient
}

type queryRequestBody struct {
	Query    string        `json:"query"`
	Strategy QueryStrategy `json:"strategy,omitempty"`
	TopK     int           `json:"top_k,omitempty"`
}

// Execute runs a query and waits for the full (non-streaming) answer.
func (s *QueryService) Execute(ctx context.Context, query string, opts QueryOptions) (*QueryResponse, error) {
	body := queryRequestBody{Query: query, Strategy: opts.Strategy, TopK: opts.TopK}

	var out QueryResponse
	if err := s.http.doJSON(ctx, "POST", "/queries/v1/query", nil, body, &out); err != nil {
		return nil, fmt.Errorf("fugu: query execute: %w", err)
	}
	return &out, nil
}

// Stream runs a query and streams the answer via Server-Sent Events. It
// returns a channel of StreamEvent and a channel of a single terminal error
// (nil on success); both channels are closed when the stream ends. Iterate
// with a for-range over the events channel:
//
//	events, errc := client.Query.Stream(ctx, "my question", fugu.QueryOptions{})
//	for event := range events {
//	    if event.Type == fugu.StreamEventDelta {
//	        fmt.Print(event.Text)
//	    }
//	}
//	if err := <-errc; err != nil {
//	    log.Fatal(err)
//	}
func (s *QueryService) Stream(ctx context.Context, query string, opts QueryOptions) (<-chan StreamEvent, <-chan error) {
	events := make(chan StreamEvent)
	errc := make(chan error, 1)

	go func() {
		defer close(events)
		defer close(errc)

		body := queryRequestBody{Query: query, Strategy: opts.Strategy, TopK: opts.TopK}
		res, err := s.http.doStream(ctx, "POST", "/queries/stream", body)
		if err != nil {
			errc <- fmt.Errorf("fugu: query stream: %w", err)
			return
		}
		defer res.Body.Close()

		scanner := bufio.NewScanner(res.Body)
		scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

		var frame strings.Builder
		flush := func() error {
			text := frame.String()
			frame.Reset()
			for _, line := range strings.Split(text, "\n") {
				if !strings.HasPrefix(line, "data:") {
					continue
				}
				payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
				var event StreamEvent
				if err := json.Unmarshal([]byte(payload), &event); err != nil {
					return fmt.Errorf("fugu: decoding stream event: %w", err)
				}
				select {
				case events <- event:
				case <-ctx.Done():
					return ctx.Err()
				}
			}
			return nil
		}

		for scanner.Scan() {
			line := scanner.Text()
			if line == "" {
				if err := flush(); err != nil {
					errc <- err
					return
				}
				continue
			}
			frame.WriteString(line)
			frame.WriteString("\n")
		}
		if frame.Len() > 0 {
			if err := flush(); err != nil {
				errc <- err
				return
			}
		}
		if err := scanner.Err(); err != nil {
			errc <- fmt.Errorf("fugu: reading stream: %w", err)
			return
		}
	}()

	return events, errc
}
