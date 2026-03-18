package service

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestBuildReportURLCandidatesSecureFirst(t *testing.T) {
	upload, config := buildReportURLCandidates("panel.example.com:443", "abc")
	if len(upload) != 2 || len(config) != 2 {
		t.Fatalf("unexpected candidate counts: upload=%d config=%d", len(upload), len(config))
	}
	if upload[0] != "https://panel.example.com:443/flow/upload?secret=abc" || upload[1] != "http://panel.example.com:443/flow/upload?secret=abc" {
		t.Fatalf("unexpected upload candidates: %#v", upload)
	}
	if config[0] != "https://panel.example.com:443/flow/config?secret=abc" || config[1] != "http://panel.example.com:443/flow/config?secret=abc" {
		t.Fatalf("unexpected config candidates: %#v", config)
	}
}

func TestBuildReportURLCandidatesNormalizeSchemeAddr(t *testing.T) {
	upload, config := buildReportURLCandidates("https://panel.example.com:8443/path", "abc")
	if upload[0] != "https://panel.example.com:8443/flow/upload?secret=abc" || upload[1] != "http://panel.example.com:8443/flow/upload?secret=abc" {
		t.Fatalf("unexpected upload candidates: %#v", upload)
	}
	if config[0] != "https://panel.example.com:8443/flow/config?secret=abc" || config[1] != "http://panel.example.com:8443/flow/config?secret=abc" {
		t.Fatalf("unexpected config candidates: %#v", config)
	}
}

func TestPostJSONWithFallbackUsesHTTPAfterHTTPSFailure(t *testing.T) {
	orig := reportDo
	defer func() { reportDo = orig }()

	var calls []string
	reportDo = func(_ context.Context, req *http.Request, _ time.Duration) (*http.Response, error) {
		calls = append(calls, req.URL.String())
		if strings.HasPrefix(req.URL.String(), "https://") {
			return nil, errors.New("tls handshake failed")
		}
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader("ok"))}, nil
	}

	ok, err := postJSONWithFallback(context.Background(), []string{"https://panel.example.com:443/flow/upload?secret=abc", "http://panel.example.com:443/flow/upload?secret=abc"}, []byte(`[]`), "GOST-Traffic-Reporter/1.0", 5*time.Second, nil)
	if !ok || err != nil {
		t.Fatalf("expected fallback success, ok=%v err=%v", ok, err)
	}
	if len(calls) != 2 || !strings.HasPrefix(calls[0], "https://") || !strings.HasPrefix(calls[1], "http://") {
		t.Fatalf("unexpected call order: %#v", calls)
	}
}

func TestPostJSONWithFallbackRemembersDetectedURL(t *testing.T) {
	orig := reportDo
	defer func() { reportDo = orig }()

	targets := []string{"https://panel.example.com:443/flow/upload?secret=abc", "http://panel.example.com:443/flow/upload?secret=abc"}
	var preferred string
	var calls []string
	reportDo = func(_ context.Context, req *http.Request, _ time.Duration) (*http.Response, error) {
		calls = append(calls, req.URL.String())
		if strings.HasPrefix(req.URL.String(), "https://") {
			return nil, errors.New("tls handshake failed")
		}
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader("ok"))}, nil
	}

	ok, err := postJSONWithFallback(context.Background(), targets, []byte(`[]`), "GOST-Traffic-Reporter/1.0", 5*time.Second, &preferred)
	if !ok || err != nil {
		t.Fatalf("expected first call success, ok=%v err=%v", ok, err)
	}
	if preferred != targets[1] {
		t.Fatalf("expected preferred url %s, got %s", targets[1], preferred)
	}
	calls = nil
	ok, err = postJSONWithFallback(context.Background(), targets, []byte(`[]`), "GOST-Traffic-Reporter/1.0", 5*time.Second, &preferred)
	if !ok || err != nil {
		t.Fatalf("expected second call success, ok=%v err=%v", ok, err)
	}
	if len(calls) != 1 || !strings.HasPrefix(calls[0], "http://") {
		t.Fatalf("expected remembered http candidate first, got %#v", calls)
	}
}
