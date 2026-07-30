package main

import (
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"

	"telesma/internal/windowstate"
)

func defaultTestWindowState() windowstate.State {
	return windowstate.Default(mainWindowMinWidth, mainWindowMinHeight)
}

func TestMainWindowOptionsUsePlatformChrome(t *testing.T) {
	tests := []struct {
		platform         string
		frameless        bool
		windowsNonClient bool
	}{
		{platform: "darwin", frameless: false},
		{platform: "windows", frameless: true, windowsNonClient: true},
		{platform: "linux", frameless: true},
	}

	for _, test := range tests {
		t.Run(test.platform, func(t *testing.T) {
			options := mainWindowOptions(test.platform, defaultTestWindowState())

			if options.Frameless != test.frameless {
				t.Fatalf("frameless = %v, want %v", options.Frameless, test.frameless)
			}

			if test.windowsNonClient && !options.Windows.NonClientRegionSupport {
				t.Fatal("Windows non-client support must stay enabled")
			}

			if options.MinWidth != mainWindowMinWidth || options.MinHeight != mainWindowMinHeight {
				t.Fatalf("minimum size = %dx%d, want %dx%d", options.MinWidth, options.MinHeight, mainWindowMinWidth, mainWindowMinHeight)
			}
		})
	}
}

func TestMainWindowOptionsRestoreNormalState(t *testing.T) {
	options := mainWindowOptions("linux", windowstate.State{
		Width:  1200,
		Height: 800,
	})

	if options.Width != 1200 || options.Height != 800 {
		t.Fatalf("window size = %dx%d, want 1200x800", options.Width, options.Height)
	}

	if options.StartState != application.WindowStateNormal {
		t.Fatalf("start state = %v, want normal", options.StartState)
	}

	if options.InitialPosition == application.WindowXY || options.X != 0 || options.Y != 0 {
		t.Fatalf("window placement must remain managed by the OS: position mode %v, coordinates (%d, %d)", options.InitialPosition, options.X, options.Y)
	}
}

func TestMainWindowOptionsRestoreMaximisedState(t *testing.T) {
	options := mainWindowOptions("linux", windowstate.State{
		Width:     1200,
		Height:    800,
		Maximised: true,
	})

	if options.Width != 1200 || options.Height != 800 {
		t.Fatalf("normal window size = %dx%d, want 1200x800", options.Width, options.Height)
	}

	if options.StartState != application.WindowStateMaximised {
		t.Fatalf("start state = %v, want maximised", options.StartState)
	}
}
