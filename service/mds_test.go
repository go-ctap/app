package service

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/mds"
)

func TestNormalizeMDSErrorPreservesHTTPStatus(t *testing.T) {
	err := normalizeMDSError(fmt.Errorf("lookup: %w", &mds.HTTPStatusError{
		StatusCode: http.StatusTooManyRequests,
	}))

	if !failure.IsCode(err, failure.CodeMDSFetchFailed) {
		t.Fatalf("LookupMDS error = %v, want %s", err, failure.CodeMDSFetchFailed)
	}

	snapshot := failure.Snapshot(err)

	if snapshot.Params["httpStatus"] != "429" {
		t.Fatalf("LookupMDS params = %#v, want httpStatus 429", snapshot.Params)
	}
}
