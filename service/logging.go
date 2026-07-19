package service

import (
	"strconv"
	"time"

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

func operationEventLogEntry(state *operationState, event model.OperationEvent) model.LogEntry {
	params := map[string]string{"stage": string(event.Stage)}
	if event.Kind != "" {
		params["interactionKind"] = string(event.Kind)
	}

	if event.Completed != nil {
		params["completed"] = strconv.FormatUint(*event.Completed, 10)
	}

	if event.Total != nil {
		params["total"] = strconv.FormatUint(*event.Total, 10)
	}

	if event.SampleStatus != "" {
		params["sampleStatus"] = event.SampleStatus
	}

	return model.LogEntry{
		Timestamp:     time.Now().UTC(),
		Layer:         model.LogLayerOperation,
		Level:         model.LogLevelDebug,
		Outcome:       model.LogOutcomeEvent,
		Code:          model.LogCodeOperationProgress,
		Params:        params,
		OperationKind: state.kind,
		SelectionID:   string(state.selectionID),
		OperationID:   string(state.id),
	}
}
