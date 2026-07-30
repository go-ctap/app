package service

import (
	"context"
	"encoding/hex"

	ctapkit "github.com/go-ctap/kit"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/largeblobs"
)

type LargeBlobDecodeRequest struct {
	RawHex string                `json:"rawHex"`
	Mode   largeblobs.DecodeMode `json:"mode"`
}

type LargeBlobDecodeEnvelope struct {
	Result *largeblobs.DecodeResult `json:"result,omitempty"`
	Error  *failure.Failure         `json:"error,omitempty"`
}

func (*Service) DecodeLargeBlob(
	_ context.Context,
	req LargeBlobDecodeRequest,
) LargeBlobDecodeEnvelope {
	raw, err := hex.DecodeString(req.RawHex)
	if err != nil {
		return LargeBlobDecodeEnvelope{
			Error: failure.Snapshot(failure.Wrap(
				failure.CodeInternalError,
				err,
				failure.WithPhase(failure.PhaseDecode),
			)),
		}
	}

	result, err := ctapkit.DecodeLargeBlob(raw, req.Mode)
	if err != nil {
		return LargeBlobDecodeEnvelope{Error: failure.Snapshot(err)}
	}

	return LargeBlobDecodeEnvelope{Result: &result}
}
