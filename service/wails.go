package service

import (
	"context"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func NewWailsService() *Service {
	return New(WithEventEmitter(wailsEmitter{}))
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
			case <-s.logChanges():
				application.Get().Event.Emit(EventLogsChanged, s.currentLogCursor())
			}
		}
	}()

	return nil
}

func (s *Service) ServiceShutdown() error {
	return s.close()
}

type wailsEmitter struct{}

func (wailsEmitter) Emit(name string, payload any) {
	switch name {
	case EventDiscoveryChanged, EventOperationEvent, EventInteractionRequested:
		application.Get().Event.Emit(name, payload)
	}
}
