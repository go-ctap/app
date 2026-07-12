package main

import (
	"embed"
	"log"
	"runtime"

	kitservice "github.com/go-ctap/kit/service"
	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func init() {
	application.RegisterEvent[kitservice.DiscoveryChangedEnvelope](kitservice.EventDiscoveryChanged)
	application.RegisterEvent[kitservice.OperationEventEnvelope](kitservice.EventOperationEvent)
	application.RegisterEvent[kitservice.InteractionPrompt](kitservice.EventInteractionRequested)
}

func mainWindowOptions(goos string) application.WebviewWindowOptions {
	macSidebarTint := application.NewRGBA(30, 30, 32, 96)
	options := application.WebviewWindowOptions{
		Title:     "FIDO Authenticator Workbench",
		Frameless: true,
		Mac: application.MacWindow{
			Backdrop:           application.MacBackdropLiquidGlass,
			TitleBar:           application.MacTitleBarHidden,
			CollectionBehavior: application.MacWindowCollectionBehaviorFullScreenPrimary,
			LiquidGlass: application.MacLiquidGlass{
				Style:     application.LiquidGlassStyleDark,
				Material:  application.NSVisualEffectMaterialSidebar,
				TintColor: &macSidebarTint,
			},
		},
		Windows: application.WindowsWindow{
			NonClientRegionSupport:     true,
			WebView2CompositionHosting: true,
		},
		BackgroundColour: application.NewRGB(0, 0, 0),
		URL:              "/",
	}

	if goos == "darwin" {
		options.Frameless = false
	}

	return options
}

func main() {
	ctapkitService := NewCtapkitService()
	app := application.New(application.Options{
		Name:        "fidoapp",
		Description: "Hardware authenticator workbench",
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

	app.Window.NewWithOptions(mainWindowOptions(runtime.GOOS))

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
