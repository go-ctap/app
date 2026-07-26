package main

import (
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func TestMainWindowOptionsUseNativeMacChrome(t *testing.T) {
	options := mainWindowOptions("darwin", defaultMainWindowState())

	if options.Frameless {
		t.Fatal("macOS main window must keep its native frame")
	}
	if options.Mac.TitleBar != application.MacTitleBarHiddenInset {
		t.Fatalf("macOS title bar = %#v, want MacTitleBarHiddenInset", options.Mac.TitleBar)
	}
	if options.Mac.CollectionBehavior != application.MacWindowCollectionBehaviorFullScreenPrimary {
		t.Fatalf("macOS collection behavior = %v, want FullScreenPrimary", options.Mac.CollectionBehavior)
	}
	if options.Mac.Backdrop != application.MacBackdropLiquidGlass {
		t.Fatalf("macOS backdrop = %v, want liquid glass", options.Mac.Backdrop)
	}
	if options.Mac.LiquidGlass.Style != application.LiquidGlassStyleDark {
		t.Fatalf("macOS liquid glass style = %v, want dark", options.Mac.LiquidGlass.Style)
	}
	if options.Mac.LiquidGlass.Material != application.NSVisualEffectMaterialSidebar {
		t.Fatalf("macOS liquid glass material = %v, want sidebar", options.Mac.LiquidGlass.Material)
	}
	if options.Mac.LiquidGlass.TintColor == nil || *options.Mac.LiquidGlass.TintColor != application.NewRGBA(30, 30, 32, 96) {
		t.Fatalf("macOS liquid glass tint = %#v, want neutral dark sidebar tint", options.Mac.LiquidGlass.TintColor)
	}
}

func TestMainWindowOptionsSetMinimumSize(t *testing.T) {
	options := mainWindowOptions("darwin", defaultMainWindowState())

	if options.MinWidth != mainWindowMinWidth {
		t.Fatalf("minimum window width = %d, want %d", options.MinWidth, mainWindowMinWidth)
	}
	if options.MinHeight != mainWindowMinHeight {
		t.Fatalf("minimum window height = %d, want %d", options.MinHeight, mainWindowMinHeight)
	}
}

func TestMainWindowOptionsPreserveWindowsNonClientRegions(t *testing.T) {
	options := mainWindowOptions("windows", defaultMainWindowState())

	if !options.Frameless {
		t.Fatal("Windows main window must stay frameless")
	}
	if !options.Windows.NonClientRegionSupport {
		t.Fatal("Windows non-client region support must stay enabled")
	}
	if !options.Windows.WebView2CompositionHosting {
		t.Fatal("Windows composition hosting must stay enabled")
	}
	if options.Windows.DisableFramelessWindowDecorations {
		t.Fatal("Windows frameless decorations must stay enabled")
	}
	if options.BackgroundType != application.BackgroundTypeSolid {
		t.Fatalf("Windows background type = %v, want solid", options.BackgroundType)
	}
}

func TestMainWindowOptionsKeepLinuxFrameless(t *testing.T) {
	if !mainWindowOptions("linux", defaultMainWindowState()).Frameless {
		t.Fatal("Linux main window must stay frameless")
	}
}

func TestMainWindowOptionsRestoreNormalState(t *testing.T) {
	options := mainWindowOptions("linux", persistedMainWindowState{
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
	options := mainWindowOptions("linux", persistedMainWindowState{
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
