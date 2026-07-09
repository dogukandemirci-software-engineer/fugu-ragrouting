package fugu

import "fmt"

// APIError represents a non-2xx response from the FUGU API.
type APIError struct {
	Status  int
	Code    string
	Message string
}

func (e *APIError) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("fugu: %s (status=%d code=%s)", e.Message, e.Status, e.Code)
	}
	return fmt.Sprintf("fugu: %s (status=%d)", e.Message, e.Status)
}

// BYOKRequiredError is returned when the organization has no active LLM
// credential configured. It wraps an *APIError so both errors.As(&APIError{})
// and errors.As(&BYOKRequiredError{}) succeed, and errors.Is(err,
// ErrBYOKRequired) can be used as a lightweight sentinel check.
type BYOKRequiredError struct {
	*APIError
}

// QuotaExceededError is returned when the org's monthly query quota is exhausted.
type QuotaExceededError struct {
	*APIError
}

// errBYOKRequiredSentinel and errQuotaExceededSentinel allow errors.Is checks
// without needing the caller to construct a comparison value.
type sentinel string

func (s sentinel) Error() string { return string(s) }

// ErrBYOKRequired is a sentinel usable with errors.Is(err, fugu.ErrBYOKRequired).
const ErrBYOKRequired = sentinel("fugu: BYOK_REQUIRED")

// ErrQuotaExceeded is a sentinel usable with errors.Is(err, fugu.ErrQuotaExceeded).
const ErrQuotaExceeded = sentinel("fugu: QUOTA_EXCEEDED")

// Is implements errors.Is support so errors.Is(err, ErrBYOKRequired) works
// for a *BYOKRequiredError without string comparison of the dynamic message.
func (e *BYOKRequiredError) Is(target error) bool {
	return target == ErrBYOKRequired
}

// Is implements errors.Is support for ErrQuotaExceeded.
func (e *QuotaExceededError) Is(target error) bool {
	return target == ErrQuotaExceeded
}

type apiErrorBody struct {
	Error struct {
		Message string `json:"message"`
		Code    string `json:"code"`
	} `json:"error"`
}

func errorFromResponse(status int, body *apiErrorBody) error {
	message := fmt.Sprintf("request failed with status %d", status)
	code := ""
	if body != nil && body.Error.Message != "" {
		message = body.Error.Message
	}
	if body != nil {
		code = body.Error.Code
	}

	base := &APIError{Status: status, Code: code, Message: message}
	switch code {
	case "BYOK_REQUIRED":
		return &BYOKRequiredError{base}
	case "QUOTA_EXCEEDED":
		return &QuotaExceededError{base}
	default:
		return base
	}
}
