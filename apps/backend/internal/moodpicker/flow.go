package moodpicker

// questionSlot is one position in the adaptive flow. resolve returns the
// question id to ask at this slot given the answers so far, or "" to skip it
// (e.g. a mood sub-branch that doesn't apply).
type questionSlot struct {
	resolve func(answers map[string]string) string
}

// fixed always asks the same question at this slot.
func fixed(id string) questionSlot {
	return questionSlot{resolve: func(map[string]string) string { return id }}
}

// moodBranch resolves the mood-specific follow-up question, or "" if the chosen
// mood has no sub-branch.
func moodBranch() questionSlot {
	return questionSlot{resolve: func(answers map[string]string) string {
		switch answers["mood"] {
		case "scary":
			return "scary_type"
		case "think":
			return "think_type"
		case "adrenaline":
			return "pace"
		case "cry":
			return "cry_type"
		default:
			return ""
		}
	}}
}

// quickFlow is the short guided path; standardFlow is the full one. Slot order
// encodes rule-based priority (used by the deterministic engine and as the AI
// fallback).
var (
	quickFlow = []questionSlot{
		fixed("mood"),
		moodBranch(),
		fixed("region"),
		fixed("time"),
		fixed("discovery"),
	}
	standardFlow = []questionSlot{
		fixed("mood"),
		moodBranch(),
		fixed("region"),
		fixed("time"),
		fixed("era"),
		fixed("company"),
		fixed("discovery"),
	}
)

func flowFor(depth string) []questionSlot {
	if NormalizeDepth(depth) == "quick" {
		return quickFlow
	}
	return standardFlow
}

// eligibleNextIDs returns the ids of questions that could be asked next: slots
// that resolve to a valid, still-unanswered question, in flow (priority) order.
func eligibleNextIDs(depth string, answers map[string]string) []string {
	ids := make([]string, 0)
	seen := make(map[string]bool)
	for _, slot := range flowFor(depth) {
		id := slot.resolve(answers)
		if id == "" || seen[id] {
			continue
		}
		if _, ok := questions[id]; !ok {
			continue
		}
		if _, answered := answers[id]; answered {
			continue
		}
		seen[id] = true
		ids = append(ids, id)
	}
	return ids
}

// nextQuestionIDRules returns the deterministic next question id and whether the
// flow is complete.
func nextQuestionIDRules(depth string, answers map[string]string) (string, bool) {
	eligible := eligibleNextIDs(depth, answers)
	if len(eligible) == 0 {
		return "", true
	}
	return eligible[0], false
}
