package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestMainWindowStateTrackerKeepsNormalSizeOutsideNormalState(t *testing.T) {
	tests := map[string]struct {
		initial persistedMainWindowState
		record  func(*mainWindowStateTracker)
		wantMax bool
	}{
		"maximised": {
			initial: persistedMainWindowState{Width: 1200, Height: 800},
			record: func(tracker *mainWindowStateTracker) {
				tracker.recordResize(1920, 1080, false, true, false)
			},
			wantMax: true,
		},
		"minimised": {
			initial: persistedMainWindowState{Width: 1200, Height: 800},
			record: func(tracker *mainWindowStateTracker) {
				tracker.recordResize(640, 480, true, false, false)
			},
		},
		"fullscreen": {
			initial: persistedMainWindowState{Width: 1200, Height: 800, Maximised: true},
			record: func(tracker *mainWindowStateTracker) {
				tracker.recordResize(1920, 1080, false, false, true)
				tracker.recordMaximised(false, true)
			},
			wantMax: true,
		},
	}

	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			tracker := newMainWindowStateTracker(test.initial)
			test.record(tracker)

			state := tracker.snapshot()
			if state.Width != 1200 || state.Height != 800 {
				t.Fatalf("normal size = %dx%d, want 1200x800", state.Width, state.Height)
			}
			if state.Maximised != test.wantMax {
				t.Fatalf("maximised = %t, want %t", state.Maximised, test.wantMax)
			}
		})
	}
}

func TestMainWindowStateTrackerResumesNormalSizeAfterUnmaximise(t *testing.T) {
	tracker := newMainWindowStateTracker(persistedMainWindowState{
		Width:     1200,
		Height:    800,
		Maximised: true,
	})

	tracker.recordMaximised(false, false)
	tracker.recordResize(1100, 700, false, false, false)

	state := tracker.snapshot()
	if state.Width != 1100 || state.Height != 700 {
		t.Fatalf("normal size = %dx%d, want 1100x700", state.Width, state.Height)
	}
	if state.Maximised {
		t.Fatal("maximised preference remained set after unmaximise")
	}
}

func TestMainWindowStateRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), mainWindowStateFile)
	want := persistedMainWindowState{
		Width:     1200,
		Height:    800,
		Maximised: true,
	}

	if err := saveMainWindowState(path, want); err != nil {
		t.Fatalf("save window state: %v", err)
	}
	if got := loadMainWindowState(path); got != want {
		t.Fatalf("loaded window state = %#v, want %#v", got, want)
	}
}

func TestLoadMainWindowStateFallsBackToDefault(t *testing.T) {
	tests := map[string]func(t *testing.T) string{
		"missing": func(t *testing.T) string {
			return filepath.Join(t.TempDir(), mainWindowStateFile)
		},
		"damaged": func(t *testing.T) string {
			path := filepath.Join(t.TempDir(), mainWindowStateFile)
			if err := os.WriteFile(path, []byte("{"), 0o600); err != nil {
				t.Fatalf("write damaged state: %v", err)
			}
			return path
		},
		"too small": func(t *testing.T) string {
			path := filepath.Join(t.TempDir(), mainWindowStateFile)
			if err := os.WriteFile(path, []byte(`{"width":799,"height":599,"maximised":true}`), 0o600); err != nil {
				t.Fatalf("write undersized state: %v", err)
			}
			return path
		},
	}

	for name, pathForTest := range tests {
		t.Run(name, func(t *testing.T) {
			if got, want := loadMainWindowState(pathForTest(t)), defaultMainWindowState(); got != want {
				t.Fatalf("loaded window state = %#v, want default %#v", got, want)
			}
		})
	}
}
