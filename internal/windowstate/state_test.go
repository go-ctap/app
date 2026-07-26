package windowstate

import (
	"os"
	"path/filepath"
	"testing"
)

const (
	testMinWidth  = 800
	testMinHeight = 600
)

func TestTrackerKeepsNormalSizeOutsideNormalState(t *testing.T) {
	tests := map[string]struct {
		initial State
		record  func(*Tracker)
		wantMax bool
	}{
		"maximised": {
			initial: State{Width: 1200, Height: 800},
			record: func(tracker *Tracker) {
				tracker.RecordResize(1920, 1080, false, true, false)
			},
			wantMax: true,
		},
		"minimised": {
			initial: State{Width: 1200, Height: 800},
			record: func(tracker *Tracker) {
				tracker.RecordResize(640, 480, true, false, false)
			},
		},
		"fullscreen": {
			initial: State{Width: 1200, Height: 800, Maximised: true},
			record: func(tracker *Tracker) {
				tracker.RecordResize(1920, 1080, false, false, true)
				tracker.RecordMaximised(false, true)
			},
			wantMax: true,
		},
	}

	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			tracker := NewTracker(test.initial, testMinWidth, testMinHeight)
			test.record(tracker)

			state := tracker.Snapshot()
			if state.Width != 1200 || state.Height != 800 {
				t.Fatalf("normal size = %dx%d, want 1200x800", state.Width, state.Height)
			}
			if state.Maximised != test.wantMax {
				t.Fatalf("maximised = %t, want %t", state.Maximised, test.wantMax)
			}
		})
	}
}

func TestTrackerResumesNormalSizeAfterUnmaximise(t *testing.T) {
	tracker := NewTracker(State{Width: 1200, Height: 800, Maximised: true}, testMinWidth, testMinHeight)

	tracker.RecordMaximised(false, false)
	tracker.RecordResize(1100, 700, false, false, false)

	state := tracker.Snapshot()
	if state.Width != 1100 || state.Height != 700 {
		t.Fatalf("normal size = %dx%d, want 1100x700", state.Width, state.Height)
	}
	if state.Maximised {
		t.Fatal("maximised preference remained set after unmaximise")
	}
}

func TestStateRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), stateFile)
	want := State{Width: 1200, Height: 800, Maximised: true}

	if err := Save(path, want); err != nil {
		t.Fatalf("save window state: %v", err)
	}
	if got := Load(path, testMinWidth, testMinHeight); got != want {
		t.Fatalf("loaded window state = %#v, want %#v", got, want)
	}
}

func TestLoadFallsBackToDefault(t *testing.T) {
	tests := map[string]func(t *testing.T) string{
		"missing": func(t *testing.T) string {
			return filepath.Join(t.TempDir(), stateFile)
		},
		"damaged": func(t *testing.T) string {
			path := filepath.Join(t.TempDir(), stateFile)
			if err := os.WriteFile(path, []byte("{"), 0o600); err != nil {
				t.Fatalf("write damaged state: %v", err)
			}
			return path
		},
		"too small": func(t *testing.T) string {
			path := filepath.Join(t.TempDir(), stateFile)
			if err := os.WriteFile(path, []byte(`{"width":799,"height":599,"maximised":true}`), 0o600); err != nil {
				t.Fatalf("write undersized state: %v", err)
			}
			return path
		},
	}

	for name, pathForTest := range tests {
		t.Run(name, func(t *testing.T) {
			if got, want := Load(pathForTest(t), testMinWidth, testMinHeight), Default(testMinWidth, testMinHeight); got != want {
				t.Fatalf("loaded window state = %#v, want default %#v", got, want)
			}
		})
	}
}

func TestPathUsesUserConfigDirectory(t *testing.T) {
	root := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", root)

	path, err := Path()
	if err != nil {
		t.Fatalf("resolve window state path: %v", err)
	}
	if want := filepath.Join(root, "Telesma", stateFile); path != want {
		t.Fatalf("window state path = %q, want %q", path, want)
	}
}
