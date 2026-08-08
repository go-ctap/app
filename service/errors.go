package service

import (
	"github.com/telesma-app/kit/model/failure"
)

func authenticatorClosedError() error {
	return failure.New(failure.CodeAuthenticatorClosed, failure.WithPhase(failure.PhaseAuthenticator))
}
