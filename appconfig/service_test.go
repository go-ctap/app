package appconfig

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestMissingConfigUsesDefaults(t *testing.T) {
	service := newService(filepath.Join(t.TempDir(), configFile))

	snapshot, err := service.LoadApplicationConfig(context.Background())
	if err != nil {
		t.Fatalf("load missing config: %v", err)
	}
	if snapshot.Exists {
		t.Fatal("missing config reported as existing")
	}
	if snapshot.Config != defaultConfig() {
		t.Fatalf("missing config = %#v, want %#v", snapshot.Config, defaultConfig())
	}
}

func TestConfigRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), configFile)
	service := newService(path)
	want := ApplicationConfig{Locale: "ru", AdvancedMode: true}

	if err := service.SaveApplicationConfig(context.Background(), want); err != nil {
		t.Fatalf("save config: %v", err)
	}
	snapshot, err := service.LoadApplicationConfig(context.Background())
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if !snapshot.Exists {
		t.Fatal("saved config reported as missing")
	}
	if snapshot.Config != want {
		t.Fatalf("loaded config = %#v, want %#v", snapshot.Config, want)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read saved config: %v", err)
	}
	contents := string(data)
	if !strings.Contains(contents, "locale") || !strings.Contains(contents, "advanced_mode") {
		t.Fatalf("saved TOML does not contain application config keys: %q", contents)
	}
}

func TestConfigLoadsCommentsAndDefaults(t *testing.T) {
	path := filepath.Join(t.TempDir(), configFile)
	if err := os.WriteFile(path, []byte("# Telesma\nlocale = \"ru\" # interface language\n"), 0o600); err != nil {
		t.Fatalf("write config: %v", err)
	}

	snapshot, err := newService(path).LoadApplicationConfig(context.Background())
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if got, want := snapshot.Config, (ApplicationConfig{Locale: "ru"}); got != want {
		t.Fatalf("loaded config = %#v, want %#v", got, want)
	}
}

func TestConfigRejectsInvalidInput(t *testing.T) {
	tests := map[string]string{
		"unsupported locale": "locale = \"de\"\n",
		"invalid TOML":       "locale = \"ru\n",
		"duplicate key":      "locale = \"en\"\nlocale = \"ru\"\n",
		"unknown key":        "locale = \"en\"\ntheme = \"dark\"\n",
	}

	for name, contents := range tests {
		t.Run(name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), configFile)
			if err := os.WriteFile(path, []byte(contents), 0o600); err != nil {
				t.Fatalf("write config: %v", err)
			}
			if _, err := newService(path).LoadApplicationConfig(context.Background()); err == nil {
				t.Fatal("load invalid config succeeded")
			}
		})
	}
}

func TestConfigRejectsInvalidSave(t *testing.T) {
	service := newService(filepath.Join(t.TempDir(), configFile))
	err := service.SaveApplicationConfig(context.Background(), ApplicationConfig{Locale: "de"})
	if err == nil || !strings.Contains(err.Error(), "unsupported locale") {
		t.Fatalf("save error = %v, want unsupported locale", err)
	}
}

func TestConfigPathUsesUserConfigDirectory(t *testing.T) {
	root := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", root)

	path, err := configPath()
	if err != nil {
		t.Fatalf("resolve config path: %v", err)
	}
	if want := filepath.Join(root, "Telesma", configFile); path != want {
		t.Fatalf("config path = %q, want %q", path, want)
	}
}
