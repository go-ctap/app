package main

import (
	"embed"
	"log"
	"runtime"

	appservice "telesma/service"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

const (
	mainWindowMinWidth  = 800
	mainWindowMinHeight = 600
)

func init() {
	application.RegisterEvent[appservice.DiscoveryChangedEnvelope](appservice.EventDiscoveryChanged)
	application.RegisterEvent[appservice.OperationEventEnvelope](appservice.EventOperationEvent)
	application.RegisterEvent[appservice.InteractionPrompt](appservice.EventInteractionRequested)
	application.RegisterEvent[appservice.LogCursor](appservice.EventLogsChanged)
}

func mainWindowOptions(goos string, state persistedMainWindowState) application.WebviewWindowOptions {
	if !validMainWindowState(state) {
		state = defaultMainWindowState()
	}

	options := application.WebviewWindowOptions{
		Title:      "Telesma",
		Width:      state.Width,
		Height:     state.Height,
		Frameless:  true,
		MinWidth:   mainWindowMinWidth,
		MinHeight:  mainWindowMinHeight,
		StartState: application.WindowStateNormal,
		Mac: application.MacWindow{
			Backdrop:           application.MacBackdropLiquidGlass,
			TitleBar:           application.MacTitleBarHiddenInset,
			CollectionBehavior: application.MacWindowCollectionBehaviorFullScreenPrimary,
			LiquidGlass: application.MacLiquidGlass{
				Style:     application.LiquidGlassStyleDark,
				Material:  application.NSVisualEffectMaterialSidebar,
				TintColor: new(application.NewRGBA(30, 30, 32, 96)),
			},
		},
		Windows: application.WindowsWindow{
			NonClientRegionSupport:     true,
			WebView2CompositionHosting: true,
		},
		BackgroundColour: application.NewRGB(0, 0, 0),
		URL:              "/",
	}

	if state.Maximised {
		options.StartState = application.WindowStateMaximised
	}

	if goos == "darwin" {
		options.Frameless = false
	}

	return options
}

func main() {
	state, statePath := restoreMainWindowState()

	ctapkitService := NewCtapkitService()
	app := application.New(application.Options{
		Name:        "Telesma",
		Description: "Desktop workbench for local FIDO2/CTAP authenticators",
		Services: []application.Service{
			application.NewService(ctapkitService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	mainWindow := app.Window.NewWithOptions(mainWindowOptions(runtime.GOOS, state))
	trackMainWindowState(mainWindow, newMainWindowStateTracker(state), statePath)

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
