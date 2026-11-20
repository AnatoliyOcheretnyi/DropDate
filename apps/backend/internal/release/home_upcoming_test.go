package release

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

type bucketProvider struct{ active, peak atomic.Int32 }

func (p *bucketProvider) Discover(ctx context.Context, params DiscoverParams) ([]DiscoverItem, error) {
	active := p.active.Add(1)
	defer p.active.Add(-1)
	for peak := p.peak.Load(); active > peak; peak = p.peak.Load() {
		if p.peak.CompareAndSwap(peak, active) {
			break
		}
	}
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-time.After(time.Duration(10-params.Page) * time.Millisecond):
	}
	return []DiscoverItem{{TMDBID: params.Page}}, nil
}

func TestUpcomingBucketsRunConcurrentlyWithStableOrder(t *testing.T) {
	p := &bucketProvider{}
	s := &Service{discover: p}
	params := make([]DiscoverParams, 8)
	for i := range params {
		params[i].Page = i + 1
	}
	buckets := s.fetchUpcomingBuckets(context.Background(), params, 18)
	if p.peak.Load() < 2 || p.peak.Load() > 4 {
		t.Fatalf("concurrency = %d", p.peak.Load())
	}
	for i, bucket := range buckets {
		if len(bucket) != 1 || bucket[0].TMDBID != i+1 {
			t.Fatalf("country order changed: %+v", buckets)
		}
	}
}

func TestUpcomingBucketsDoNotStartRequestsAfterCancellation(t *testing.T) {
	p := &bucketProvider{}
	s := &Service{discover: p}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	s.fetchUpcomingBuckets(ctx, []DiscoverParams{{Page: 1}, {Page: 2}}, 18)
	if p.peak.Load() != 0 {
		t.Fatal("started upstream request with a cancelled context")
	}
}
