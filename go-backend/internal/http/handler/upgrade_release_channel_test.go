package handler

import "testing"

func TestReleaseChannelFromTag(t *testing.T) {
	tests := []struct {
		name    string
		tag     string
		expects string
	}{
		{name: "stable semantic version", tag: "2.1.4", expects: releaseChannelStable},
		{name: "v prefix should be ignored", tag: "v2.1.4", expects: ""},
		{name: "rc release", tag: "2.1.4-rc2", expects: releaseChannelDev},
		{name: "beta release", tag: "2.1.4-beta.1", expects: releaseChannelDev},
		{name: "alpha release", tag: "2.1.4-alpha", expects: releaseChannelDev},
		{name: "build b release", tag: "2.1.9-b6", expects: releaseChannelDev},
		{name: "non numeric tag", tag: "nightly", expects: ""},
		{name: "empty tag", tag: "", expects: ""},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := releaseChannelFromTag(tc.tag); got != tc.expects {
				t.Fatalf("releaseChannelFromTag(%q) = %q, want %q", tc.tag, got, tc.expects)
			}
		})
	}
}

func TestNormalizeReleaseChannel(t *testing.T) {
	tests := []struct {
		input   string
		expects string
	}{
		{input: "", expects: releaseChannelStable},
		{input: "stable", expects: releaseChannelStable},
		{input: "dev", expects: releaseChannelDev},
		{input: "DEV", expects: releaseChannelDev},
		{input: "preview", expects: releaseChannelStable},
	}

	for _, tc := range tests {
		if got := normalizeReleaseChannel(tc.input); got != tc.expects {
			t.Fatalf("normalizeReleaseChannel(%q) = %q, want %q", tc.input, got, tc.expects)
		}
	}
}

func TestSortReleaseItemsByVersion(t *testing.T) {
	items := []releaseItem{
		{Version: "2.1.9-b4", PublishedAt: "2026-03-08T01:00:00Z"},
		{Version: "2.1.9-RC6", PublishedAt: "2026-03-08T00:00:00Z"},
		{Version: "2.1.9-RC2", PublishedAt: "2026-03-07T00:00:00Z"},
		{Version: "2.1.10", PublishedAt: "2026-03-06T00:00:00Z"},
		{Version: "2.1.9", PublishedAt: "2026-03-05T00:00:00Z"},
	}

	sortReleaseItemsByVersion(items)

	expected := []string{"2.1.10", "2.1.9", "2.1.9-RC6", "2.1.9-RC2", "2.1.9-b4"}
	for i, v := range expected {
		if items[i].Version != v {
			t.Fatalf("order[%d] = %s, want %s", i, items[i].Version, v)
		}
	}
}
