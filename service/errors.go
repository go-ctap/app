package service

import (
	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/failure"
)

func invalidSelectionError() error {
	return failure.New(failure.CodeSelectionInvalid, failure.WithPhase(failure.PhaseSelection))
}

func normalizeServicePhaseError(err error, phase failure.Phase) error {
	return ctapkit.NormalizeError(err, phase)
}
