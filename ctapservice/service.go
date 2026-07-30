package ctapservice

import (
	"context"

	ctapkit "github.com/go-ctap/kit"
	kitmodel "github.com/go-ctap/kit/model"
	"github.com/wailsapp/wails/v3/pkg/application"

	appservice "telesma/service"
)

type Service struct {
	core *appservice.Service
}

func New() *Service {
	return &Service{
		core: appservice.New(
			appservice.WithEventEmitter(wailsEmitter{}),
		),
	}
}

func (s *Service) ServiceName() string {
	return "CtapkitService"
}

func (s *Service) ServiceStartup(ctx context.Context, _ application.ServiceOptions) error {
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-s.core.LogChanges():
				application.Get().Event.Emit(appservice.EventLogsChanged, s.core.CurrentLogCursor())
			}
		}
	}()

	return nil
}

func (s *Service) ServiceShutdown() error {
	return s.core.Close()
}

func (s *Service) ReadLogs(_ context.Context, req appservice.ReadLogsRequest) kitmodel.LogJournalBatch {
	return s.core.ReadLogs(req)
}

func (s *Service) ClearLogs(_ context.Context) appservice.LogCursor {
	return s.core.ClearLogs()
}

func (s *Service) Discover(ctx context.Context, req appservice.DiscoverRequest) (ctapkit.InventorySnapshot, error) {
	return s.core.Discover(ctx, req)
}

func (s *Service) SetSelection(ctx context.Context, req appservice.SelectionRequest) (appservice.SelectionSnapshot, error) {
	return s.core.SetSelection(ctx, req)
}

func (s *Service) CancelOperation(_ context.Context, req appservice.CancelOperationRequest) bool {
	return s.core.CancelOperation(req)
}

func (s *Service) ResolveInteraction(ctx context.Context, answer appservice.InteractionAnswer) (bool, error) {
	return s.core.ResolveInteraction(ctx, answer)
}

func (s *Service) LookupMDS(ctx context.Context, req appservice.MDSLookupRequest) (appservice.MDSLookupEnvelope, error) {
	return s.core.LookupMDS(ctx, req)
}

type wailsEmitter struct{}

func (wailsEmitter) Emit(name string, payload any) {
	app := application.Get()

	switch name {
	case appservice.EventDiscoveryChanged:
		app.Event.Emit(name, payload)
	case appservice.EventOperationEvent:
		app.Event.Emit(name, payload)
	case appservice.EventInteractionRequested:
		app.Event.Emit(name, payload)
	}
}
