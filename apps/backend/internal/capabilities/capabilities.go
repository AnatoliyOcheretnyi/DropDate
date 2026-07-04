// Package capabilities is a central switchboard for optional (mostly AI-backed)
// features. Every AI feature checks a Resolver before running, so access can be
// gated globally today and per-user (by plan/tier) later without touching call
// sites.
package capabilities

import "context"

// Feature identifies a gated capability.
type Feature string

const (
	// AIRecommendations gates the Gemini-enhanced recommendation feed.
	AIRecommendations Feature = "ai_recommendations"
	// AIMood gates AI-driven adaptive question branching in the mood picker.
	AIMood Feature = "ai_mood"
	// AIMatch gates AI-assisted selection in the match/cinematch picker.
	AIMatch Feature = "ai_match"
)

// AllFeatures lists every known feature (handy for config/dumps).
func AllFeatures() []Feature {
	return []Feature{AIRecommendations, AIMood, AIMatch}
}

// Resolver decides whether a feature is enabled for a given user. The userID is
// passed so future implementations can gate by plan/tier; the current static
// resolver ignores it and applies global flags.
type Resolver interface {
	Enabled(ctx context.Context, userID string, feature Feature) bool
}

// Static is a config-driven resolver: features are on or off globally. Replace
// it with a per-user (tier-aware) resolver later — the Resolver interface keeps
// call sites unchanged.
type Static struct {
	flags map[Feature]bool
}

// NewStatic builds a Static resolver from a flag map (missing keys default off).
func NewStatic(flags map[Feature]bool) *Static {
	copied := make(map[Feature]bool, len(flags))
	for feature, enabled := range flags {
		copied[feature] = enabled
	}
	return &Static{flags: copied}
}

// Enabled reports whether the feature is on. A nil resolver is treated as
// "everything disabled" so callers can stay nil-safe.
func (s *Static) Enabled(_ context.Context, _ string, feature Feature) bool {
	if s == nil {
		return false
	}
	return s.flags[feature]
}
