package service

import (
	"context"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func NewWailsService() *Service {
	service := New(WithEventEmitter(wailsEmitter{}))
	if cacheDir, err := os.UserCacheDir(); err == nil {
		service.metadataCachePath = filepath.Join(cacheDir, "Telesma", "device-metadata.json")
	}

	return service
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
