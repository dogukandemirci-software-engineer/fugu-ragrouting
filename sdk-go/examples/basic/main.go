// Command basic demonstrates the FUGU Go SDK against a running backend.
//
// Usage:
//
//	FUGU_API_KEY=fugu_sk_... go run ./examples/basic
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	fugu "github.com/dogukandemirci-software-engineer/fugu-ragrouting/sdk-go"
)

func main() {
	apiKey := os.Getenv("FUGU_API_KEY")
	if apiKey == "" {
		fmt.Fprintln(os.Stderr, "set FUGU_API_KEY to a valid fugu_sk_... key")
		os.Exit(1)
	}

	baseURL := os.Getenv("FUGU_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:3001/api"
	}

	client := fugu.NewClient(apiKey, fugu.WithBaseURL(baseURL))

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// 1. Non-streaming query
	resp, err := client.Query.Execute(ctx, "what does FUGU combine to answer questions", fugu.QueryOptions{})
	if err != nil {
		var byok *fugu.BYOKRequiredError
		var quota *fugu.QuotaExceededError
		switch {
		case errors.As(err, &byok):
			fmt.Println("no LLM credential configured for this org; set one via client.Credentials.Save")
			return
		case errors.As(err, &quota):
			fmt.Println("monthly query quota exceeded")
			return
		default:
			fmt.Fprintln(os.Stderr, "query failed:", err)
			os.Exit(1)
		}
	}
	fmt.Println("Answer:", resp.Answer)
	fmt.Println("Sources:", len(resp.Results))

	// 2. Streaming query
	fmt.Println("\nStreaming:")
	events, errc := client.Query.Stream(ctx, "what does FUGU combine to answer questions", fugu.QueryOptions{})
	var answer strings.Builder
	for event := range events {
		switch event.Type {
		case fugu.StreamEventDelta:
			answer.WriteString(event.Text)
			fmt.Print(event.Text)
		case fugu.StreamEventDone:
			fmt.Println("\n[done]", event.Citations)
		case fugu.StreamEventError:
			fmt.Fprintln(os.Stderr, "\n[stream error]", event.Message)
		}
	}
	if err := <-errc; err != nil {
		fmt.Fprintln(os.Stderr, "stream error:", err)
	}

	// 3. Documents
	docs, err := client.Documents.List(ctx, fugu.ListDocumentsOptions{Limit: 5})
	if err != nil {
		fmt.Fprintln(os.Stderr, "list documents failed:", err)
	} else {
		fmt.Println("\nDocuments:", len(docs))
	}

	// 4. Credentials
	cred, err := client.Credentials.Get(ctx)
	if err != nil {
		fmt.Fprintln(os.Stderr, "get credential failed:", err)
	} else {
		fmt.Printf("Credential: %+v\n", cred)
	}
}
