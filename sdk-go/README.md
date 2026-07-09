# fugu-go

Go SDK for the FUGU routed RAG API. Standard-library only (`net/http`,
`encoding/json`, `mime/multipart`) — no third-party dependencies.

## Install

```bash
go get github.com/dogukandemirci-software-engineer/fugu-ragrouting/sdk-go
```

## Quick start

```go
import fugu "github.com/dogukandemirci-software-engineer/fugu-ragrouting/sdk-go"

client := fugu.NewClient("fugu_sk_...")

resp, err := client.Query.Execute(ctx, "what does FUGU combine to answer questions", fugu.QueryOptions{})
if err != nil {
    log.Fatal(err)
}
fmt.Println(resp.Answer)
```

Configure with functional options:

```go
client := fugu.NewClient(
    "fugu_sk_...",
    fugu.WithBaseURL("https://api.example.com/api"),
    fugu.WithHTTPClient(&http.Client{Timeout: 30 * time.Second}),
)
```

## Services

- `client.Query` — `Execute`, `Stream`
- `client.Documents` — `List`, `Get`, `Upload`, `Delete`, `Retry`
- `client.Credentials` — `Get`, `ListModels`, `Save`, `Remove`

### Streaming

`Query.Stream` returns a receive-only event channel and a single-value error
channel, both closed when the stream ends:

```go
events, errc := client.Query.Stream(ctx, "my question", fugu.QueryOptions{})
for event := range events {
    switch event.Type {
    case fugu.StreamEventDelta:
        fmt.Print(event.Text)
    case fugu.StreamEventDone:
        fmt.Println("\ncitations:", event.Citations)
    case fugu.StreamEventError:
        log.Println("stream error:", event.Message)
    }
}
if err := <-errc; err != nil {
    log.Fatal(err)
}
```

### Documents

```go
f, _ := os.Open("report.pdf")
defer f.Close()

up, err := client.Documents.Upload(ctx, fugu.UploadInput{Filename: "report.pdf", Reader: f})

docs, err := client.Documents.List(ctx, fugu.ListDocumentsOptions{Limit: 20})
doc, err := client.Documents.Get(ctx, up.DocumentID)
_, err = client.Documents.Retry(ctx, up.DocumentID)
err = client.Documents.Delete(ctx, up.DocumentID)
```

### Credentials (BYOK)

```go
models, err := client.Credentials.ListModels(ctx, fugu.ProviderOpenRouter)

var modelID string
for _, m := range models {
    if m.Free {
        modelID = m.ID
        break
    }
}

cred, err := client.Credentials.Save(ctx, fugu.SaveCredentialInput{
    Provider: fugu.ProviderOpenRouter,
    Model:    modelID,
    APIKey:   "sk-or-...",
})

cred, err = client.Credentials.Get(ctx) // nil if unset
err = client.Credentials.Remove(ctx)
```

## Errors

Every non-2xx response returns an `*fugu.APIError` (with `Status` and
`Code`). Two conditions get typed wrappers usable with `errors.As`, plus
sentinels usable with `errors.Is`:

```go
resp, err := client.Query.Execute(ctx, "...", fugu.QueryOptions{})
if err != nil {
    var byok *fugu.BYOKRequiredError
    var quota *fugu.QuotaExceededError
    switch {
    case errors.As(err, &byok):
        // org has no LLM credential configured (HTTP 409)
    case errors.As(err, &quota):
        // monthly query quota exceeded (HTTP 429)
    case errors.Is(err, fugu.ErrBYOKRequired): // equivalent to the errors.As check above
    default:
        var apiErr *fugu.APIError
        if errors.As(err, &apiErr) {
            log.Println(apiErr.Status, apiErr.Code, apiErr.Message)
        }
    }
}
```

## Example

See [examples/basic/main.go](examples/basic/main.go):

```bash
FUGU_API_KEY=fugu_sk_... go run ./examples/basic
```

## Development

```bash
go build ./...
go vet ./...
```
