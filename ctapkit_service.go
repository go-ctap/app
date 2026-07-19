package main

import (
	"context"

	appservice "fidobench/service"
	kitmodel "github.com/go-ctap/kit/model"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type CtapkitService struct {
	core *appservice.Service
}

func NewCtapkitService() *CtapkitService {
	return &CtapkitService{
		core: appservice.New(
			appservice.WithEventEmitter(wailsEmitter{}),
		),
	}
}

func (s *CtapkitService) ServiceName() string {
	return "CtapkitService"
}

func (s *CtapkitService) ServiceStartup(ctx context.Context, _ application.ServiceOptions) error {
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

func (s *CtapkitService) ServiceShutdown() error {
	return s.core.Close()
}

func (s *CtapkitService) ReadLogs(_ context.Context, req appservice.ReadLogsRequest) kitmodel.LogJournalBatch {
	return s.core.ReadLogs(req)
}

func (s *CtapkitService) ClearLogs(_ context.Context) appservice.LogCursor {
	return s.core.ClearLogs()
}

func (s *CtapkitService) Discover(ctx context.Context, req appservice.DiscoverRequest) (appservice.DiscoverySnapshot, error) {
	return s.core.Discover(ctx, req)
}

func (s *CtapkitService) StartDiscoveryMonitoring(ctx context.Context) error {
	return s.core.StartDiscoveryMonitoring(ctx)
}

func (s *CtapkitService) RefreshDiscovery(ctx context.Context, req appservice.DiscoverRequest) error {
	return s.core.RefreshDiscovery(ctx, req)
}

func (s *CtapkitService) SetSelection(ctx context.Context, req appservice.SelectionRequest) (appservice.SelectionSnapshot, error) {
	return s.core.SetSelection(ctx, req)
}

func (s *CtapkitService) CancelOperation(_ context.Context, req appservice.CancelOperationRequest) bool {
	return s.core.CancelOperation(req)
}

func (s *CtapkitService) ResolveInteraction(ctx context.Context, answer appservice.InteractionAnswer) (bool, error) {
	return s.core.ResolveInteraction(ctx, answer)
}

func (s *CtapkitService) LookupMDS(ctx context.Context, req appservice.MDSLookupRequest) (appservice.MDSLookupEnvelope, error) {
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
