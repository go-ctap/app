package main

import (
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func TestMainWindowOptionsUseNativeMacChrome(t *testing.T) {
	options := mainWindowOptions("darwin")

	if options.Frameless {
		t.Fatal("macOS main window must keep its native frame")
	}
	if options.Mac.TitleBar != application.MacTitleBarHidden {
		t.Fatalf("macOS title bar = %#v, want MacTitleBarHidden", options.Mac.TitleBar)
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

func TestMainWindowOptionsPreserveWindowsNonClientRegions(t *testing.T) {
	options := mainWindowOptions("windows")

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
	if !mainWindowOptions("linux").Frameless {
		t.Fatal("Linux main window must stay frameless")
	}
}
