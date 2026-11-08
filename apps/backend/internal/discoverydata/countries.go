package discoverydata

import (
	_ "embed"
	"encoding/json"
)

//go:embed countries.json
var raw []byte

type Country struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

var Countries = func() map[string]Country {
	var list []Country
	if err := json.Unmarshal(raw, &list); err != nil {
		panic(err)
	}
	out := map[string]Country{}
	for _, c := range list {
		out[c.Code] = c
	}
	return out
}()

func Valid(code string) bool { _, ok := Countries[code]; return ok }
