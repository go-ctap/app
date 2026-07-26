package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

const mainWindowStateFile = "window-state.json"

type persistedMainWindowState struct {
	Width     int  `json:"width"`
	Height    int  `json:"height"`
	Maximised bool `json:"maximised"`
}

type mainWindowStateTracker struct {
	mu    sync.Mutex
	state persistedMainWindowState
}

func defaultMainWindowState() persistedMainWindowState {
	return persistedMainWindowState{
		Width:  mainWindowMinWidth,
		Height: mainWindowMinHeight,
	}
}

func validMainWindowState(state persistedMainWindowState) bool {
	return state.Width >= mainWindowMinWidth && state.Height >= mainWindowMinHeight
}

func loadMainWindowState(path string) persistedMainWindowState {
	data, err := os.ReadFile(path)
	if err != nil {
		return defaultMainWindowState()
	}

	var state persistedMainWindowState
	if err := json.Unmarshal(data, &state); err != nil || !validMainWindowState(state) {
		return defaultMainWindowState()
	}
	return state
}

func saveMainWindowState(path string, state persistedMainWindowState) error {
	data, err := json.Marshal(state)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

func mainWindowStatePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "Telesma", mainWindowStateFile), nil
}

func restoreMainWindowState() (persistedMainWindowState, string) {
	path, err := mainWindowStatePath()
	if err != nil {
		return defaultMainWindowState(), ""
	}
	return loadMainWindowState(path), path
}

func newMainWindowStateTracker(initial persistedMainWindowState) *mainWindowStateTracker {
	return &mainWindowStateTracker{state: initial}
}

func (tracker *mainWindowStateTracker) recordResize(width, height int, minimised, maximised, fullscreen bool) {
	if minimised || fullscreen {
		return
	}

	tracker.mu.Lock()
	defer tracker.mu.Unlock()
	tracker.state.Maximised = maximised
	if maximised || width < mainWindowMinWidth || height < mainWindowMinHeight {
		return
	}
	tracker.state.Width = width
	tracker.state.Height = height
}

func (tracker *mainWindowStateTracker) recordMaximised(maximised, fullscreen bool) {
	if fullscreen {
		return
	}
	tracker.mu.Lock()
	tracker.state.Maximised = maximised
	tracker.mu.Unlock()
}

func (tracker *mainWindowStateTracker) snapshot() persistedMainWindowState {
	tracker.mu.Lock()
	defer tracker.mu.Unlock()
	return tracker.state
}

func recordCurrentMainWindowState(window *application.WebviewWindow, tracker *mainWindowStateTracker) {
	width, height := window.Size()
	tracker.recordResize(
		width,
		height,
		window.IsMinimised(),
		window.IsMaximised(),
		window.IsFullscreen(),
	)
}

func trackMainWindowState(window *application.WebviewWindow, tracker *mainWindowStateTracker, statePath string) {
	window.OnWindowEvent(events.Common.WindowDidResize, func(_ *application.WindowEvent) {
		recordCurrentMainWindowState(window, tracker)
	})
	window.OnWindowEvent(events.Common.WindowMaximise, func(_ *application.WindowEvent) {
		tracker.recordMaximised(true, window.IsFullscreen())
	})
	window.OnWindowEvent(events.Common.WindowUnMaximise, func(_ *application.WindowEvent) {
		tracker.recordMaximised(false, window.IsFullscreen())
	})
	window.RegisterHook(events.Common.WindowClosing, func(_ *application.WindowEvent) {
		recordCurrentMainWindowState(window, tracker)
		if statePath != "" {
			_ = saveMainWindowState(statePath, tracker.snapshot())
		}
	})
}
