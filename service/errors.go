package service

import (
	"github.com/go-ctap/kit/model/failure"
)

func authenticatorClosedError() error {
	return failure.New(failure.CodeAuthenticatorClosed, failure.WithPhase(failure.PhaseAuthenticator))
}
