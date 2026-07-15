package main

import (
	"context"

	kitmodel "github.com/go-ctap/kit/model"
	kitservice "github.com/go-ctap/kit/service"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type CtapkitService struct {
	core *kitservice.Service
}

func NewCtapkitService() *CtapkitService {
	return &CtapkitService{
		core: kitservice.New(
			kitservice.WithStrictPermissions(true),
			kitservice.WithEventEmitter(wailsEmitter{}),
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
				application.Get().Event.Emit(kitservice.EventLogsChanged, s.core.CurrentLogCursor())
			}
		}
	}()

	return nil
}

func (s *CtapkitService) ServiceShutdown() error {
	return s.core.Close()
}

func (s *CtapkitService) ReadLogs(_ context.Context, req kitservice.ReadLogsRequest) kitmodel.LogJournalBatch {
	return s.core.ReadLogs(req)
}

func (s *CtapkitService) ClearLogs(_ context.Context) kitservice.LogCursor {
	return s.core.ClearLogs()
}

func (s *CtapkitService) Discover(ctx context.Context, req kitservice.DiscoverRequest) (kitservice.DiscoverySnapshot, error) {
	return s.core.Discover(ctx, req)
}

func (s *CtapkitService) StartDiscoveryMonitoring(ctx context.Context) error {
	return s.core.StartDiscoveryMonitoring(ctx)
}

func (s *CtapkitService) RefreshDiscovery(ctx context.Context, req kitservice.DiscoverRequest) error {
	return s.core.RefreshDiscovery(ctx, req)
}

func (s *CtapkitService) OpenSession(ctx context.Context, req kitservice.OpenSessionRequest) (kitservice.SessionSnapshot, error) {
	return s.core.OpenSession(ctx, req)
}

func (s *CtapkitService) Sessions(_ context.Context) []kitservice.SessionSnapshot {
	return s.core.Sessions()
}

func (s *CtapkitService) CloseAllSessions(_ context.Context) ([]kitservice.SessionSnapshot, error) {
	return s.core.CloseAllSessions()
}

func (s *CtapkitService) CancelOperation(_ context.Context, req kitservice.CancelOperationRequest) bool {
	return s.core.CancelOperation(req)
}

func (s *CtapkitService) ResolveInteraction(ctx context.Context, answer kitservice.InteractionAnswer) (bool, error) {
	return s.core.ResolveInteraction(ctx, answer)
}

func (s *CtapkitService) LookupMDS(ctx context.Context, req kitservice.MDSLookupRequest) (kitservice.MDSLookupEnvelope, error) {
	return s.core.LookupMDS(ctx, req)
}

type wailsEmitter struct{}

func (wailsEmitter) Emit(name string, payload any) {
	app := application.Get()
	switch name {
	case kitservice.EventDiscoveryChanged:
		app.Event.Emit(name, payload)
	case kitservice.EventOperationEvent:
		app.Event.Emit(name, payload)
	case kitservice.EventInteractionRequested:
		app.Event.Emit(name, payload)
	}
}
