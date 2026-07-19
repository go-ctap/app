package service

import (
	"github.com/go-ctap/kit/model"
)

func (s *Service) ReadLogs(req ReadLogsRequest) model.LogJournalBatch {
	return s.logs.Read(req.After)
}

func (s *Service) ClearLogs() LogCursor {
	return LogCursor{Sequence: s.logs.Clear()}
}

func (s *Service) CurrentLogCursor() LogCursor {
	return LogCursor{Sequence: s.logs.Cursor()}
}

func (s *Service) LogChanges() <-chan struct{} {
	return s.logs.Changes()
}
