// Fresh-project smoke test for the Go SDK (sdk-go).
//
// What this does: creates a fugu.Client with a real API key (read from the
// FUGU_API_KEY env var — never hardcode or print a key), then exercises
// every public service against a real running FUGU backend:
//   - Credentials.Get / ListModels — BYOK credential introspection
//   - Documents.List               — document listing
//   - Query.Execute                — non-streaming RAG query
//   - Query.Stream                 — streaming RAG query (SSE)
//
// How to run:
//  1. cd examples/go-sdk-test
//  2. go mod tidy   (resolves the local sdk-go via the replace directive)
//  3. FUGU_API_KEY=fugu_sk_... FUGU_BASE_URL=http://localhost:3001/api go run main.go
//
// Requires a running FUGU backend with an organization that has a BYOK LLM
// credential configured for Query.Execute/Stream to return an actual answer
// instead of a BYOKRequiredError.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"

	fugu "github.com/dogukandemirci-software-engineer/fugu-ragrouting/sdk-go"
)

func main() {
	apiKey := os.Getenv("FUGU_API_KEY")
	if apiKey == "" {
		fmt.Fprintln(os.Stderr, "Set FUGU_API_KEY before running this example.")
		os.Exit(1)
	}
	baseURL := os.Getenv("FUGU_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:3001/api"
	}

	client := fugu.NewClient(apiKey, fugu.WithBaseURL(baseURL))
	ctx := context.Background()

	fmt.Println("--- Credentials.Get ---")
	cred, err := client.Credentials.Get(ctx)
	must(err)
	fmt.Printf("%+v\n", cred)

	fmt.Println("\n--- Credentials.ListModels(openrouter) ---")
	models, err := client.Credentials.ListModels(ctx, fugu.ProviderOpenRouter)
	must(err)
	free := 0
	for _, m := range models {
		if m.Free {
			free++
		}
	}
	fmt.Printf("%d models, %d free\n", len(models), free)

	fmt.Println("\n--- Documents.List ---")
	docs, err := client.Documents.List(ctx, fugu.ListDocumentsOptions{Limit: 5})
	must(err)
	fmt.Printf("%d document(s)\n", len(docs))

	fmt.Println("\n--- Query.Execute ---")
	result, err := client.Query.Execute(ctx, "What is FUGU?", fugu.QueryOptions{Strategy: fugu.StrategyVectorOnly, TopK: 3})
	if err != nil {
		reportQueryErr(err)
	} else {
		fmt.Println("answer:", truncate(result.Answer, 200))
		fmt.Println("citations:", result.Citations)
		fmt.Printf("quota: %+v\n", result.Quota)
	}

	fmt.Println("\n--- Query.Stream ---")
	events, errc := client.Query.Stream(ctx, "What is FUGU?", fugu.QueryOptions{Strategy: fugu.StrategyVectorOnly, TopK: 3})
	answer := ""
	for event := range events {
		switch event.Type {
		case fugu.StreamEventDelta:
			answer += event.Text
		case fugu.StreamEventDone:
			fmt.Println("stream done, citations:", event.Citations)
		case fugu.StreamEventError:
			fmt.Println("stream error event:", event.Message)
		}
	}
	if err := <-errc; err != nil {
		reportQueryErr(err)
	} else {
		fmt.Println("streamed answer:", truncate(answer, 200))
	}

	fmt.Println("\nAll checks completed.")
}

func reportQueryErr(err error) {
	var byok *fugu.BYOKRequiredError
	var quota *fugu.QuotaExceededError
	var apiErr *fugu.APIError
	switch {
	case errors.As(err, &byok):
		fmt.Println("BYOK_REQUIRED (expected if no credential configured):", byok.Message)
	case errors.As(err, &quota):
		fmt.Println("QUOTA_EXCEEDED:", quota.Message)
	case errors.As(err, &apiErr):
		fmt.Printf("API error %d (%s): %s\n", apiErr.Status, apiErr.Code, apiErr.Message)
	default:
		must(err)
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func must(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, "unexpected failure:", err)
		os.Exit(1)
	}
}
