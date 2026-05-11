package main

import (
	"context"

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

func (s *CtapkitService) ServiceShutdown() error {
	return s.core.Close()
}

func (s *CtapkitService) Discover(ctx context.Context, req kitservice.DiscoverRequest) (kitservice.DiscoverySnapshot, error) {
	return s.core.Discover(ctx, req)
}

func (s *CtapkitService) OpenSession(ctx context.Context, req kitservice.OpenSessionRequest) (kitservice.SessionSnapshot, error) {
	return s.core.OpenSession(ctx, req)
}

func (s *CtapkitService) Sessions(ctx context.Context) ([]kitservice.SessionSnapshot, error) {
	return s.core.Sessions(ctx)
}

func (s *CtapkitService) Session(ctx context.Context, id kitservice.SessionID) (kitservice.SessionSnapshot, error) {
	return s.core.Session(ctx, id)
}

func (s *CtapkitService) CloseSession(ctx context.Context, id kitservice.SessionID) (kitservice.SessionSnapshot, error) {
	return s.core.CloseSession(ctx, id)
}

func (s *CtapkitService) CloseAllSessions(ctx context.Context) ([]kitservice.SessionSnapshot, error) {
	return s.core.CloseAllSessions(ctx)
}

func (s *CtapkitService) CancelOperation(ctx context.Context, req kitservice.CancelOperationRequest) (bool, error) {
	return s.core.CancelOperation(ctx, req)
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
	case kitservice.EventOperationEvent:
		app.Event.Emit(name, payload)
	case kitservice.EventInteractionRequested:
		app.Event.Emit(name, payload)
	}
}
