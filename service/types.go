// Package service provides an application-facing orchestration layer on top of
// the public ctapkit runtime facade.
package service

import (
	"github.com/go-ctap/kit/model"
	"github.com/go-ctap/kit/model/config"
	"github.com/go-ctap/kit/model/credentials"
	"github.com/go-ctap/kit/model/failure"
	"github.com/go-ctap/kit/model/inspect"
	"github.com/go-ctap/kit/model/largeblobs"
	appmds "github.com/go-ctap/kit/model/mds"
	"github.com/go-ctap/kit/model/operation"
	"github.com/go-ctap/kit/model/report"
	"github.com/go-ctap/kit/model/webauthn"
	"github.com/go-ctap/kit/transport"
)

type SelectionID string

type OperationID string

type InteractionID string

const (
	EventDiscoveryChanged     = "ctapkit:discovery-changed"
	EventOperationEvent       = "ctapkit:operation-event"
	EventInteractionRequested = "ctapkit:interaction-requested"
	EventLogsChanged          = "ctapkit:logs-changed"
)

type ReadLogsRequest struct {
	After uint64 `json:"after,omitempty"`
}

type LogCursor struct {
	Sequence uint64 `json:"sequence"`
}

type DiscoveryTrigger string

const (
	DiscoveryTriggerMonitor  DiscoveryTrigger = "monitor"
	DiscoveryTriggerHotplug  DiscoveryTrigger = "hotplug"
	DiscoveryTriggerManual   DiscoveryTrigger = "manual"
	DiscoveryTriggerEnriched DiscoveryTrigger = "enriched"
)

type DiscoverRequest struct {
	Mode transport.Mode `json:"mode,omitempty"`
}

type DiscoverySnapshot struct {
	Devices []report.DeviceReport `json:"devices"`
}

type DiscoveryChangedEnvelope struct {
	Trigger  DiscoveryTrigger   `json:"trigger"`
	Snapshot *DiscoverySnapshot `json:"snapshot,omitempty"`
	Error    *failure.Failure   `json:"error,omitempty"`
}

type SelectionRequest struct {
	Selector string `json:"selector,omitempty"`
}

type SelectionSnapshot struct {
	Selection *ActiveSelection `json:"selection,omitempty"`
}

type ActiveSelection struct {
	ID SelectionID `json:"id"`
}

type OperationEnvelopeMeta struct {
	OperationID         OperationID      `json:"operationId"`
	SelectionID         SelectionID      `json:"selectionId"`
	Kind                operation.Kind   `json:"kind"`
	AuthenticatorClosed bool             `json:"authenticatorClosed"`
	Error               *failure.Failure `json:"error,omitempty"`
}

type InspectEnvelope struct {
	OperationEnvelopeMeta
	Result *inspect.Result `json:"result,omitempty"`
}

type CredentialsEnvelope struct {
	OperationEnvelopeMeta
	Result *credentials.InventoryReport `json:"result,omitempty"`
}

type CredentialStoreStateEnvelope struct {
	OperationEnvelopeMeta
	Result *credentials.StoreStateResult `json:"result,omitempty"`
}

type CredentialDeleteEnvelope struct {
	OperationEnvelopeMeta
	Result *credentials.DeleteOutput `json:"result,omitempty"`
}

type CredentialUpdateEnvelope struct {
	OperationEnvelopeMeta
	Result *credentials.UpdateUserOutput `json:"result,omitempty"`
}

type LargeBlobReadEnvelope struct {
	OperationEnvelopeMeta
	Result *largeblobs.ReadReport `json:"result,omitempty"`
}

type LargeBlobListEnvelope struct {
	OperationEnvelopeMeta
	Result *largeblobs.ListReport `json:"result,omitempty"`
}

type LargeBlobMutationEnvelope struct {
	OperationEnvelopeMeta
	Result *largeblobs.MutationOutput `json:"result,omitempty"`
}

type ConfigStatusEnvelope struct {
	OperationEnvelopeMeta
	Result *config.StatusReport `json:"result,omitempty"`
}

type PINEnvelope struct {
	OperationEnvelopeMeta
	Result *config.PINOutput `json:"result,omitempty"`
}

type AuthenticatorConfigEnvelope struct {
	OperationEnvelopeMeta
	Result *config.AuthenticatorConfigOutput `json:"result,omitempty"`
}

type BioSensorEnvelope struct {
	OperationEnvelopeMeta
	Result *config.BioSensorReport `json:"result,omitempty"`
}

type BioListEnvelope struct {
	OperationEnvelopeMeta
	Result *config.BioListReport `json:"result,omitempty"`
}

type BioEnrollEnvelope struct {
	OperationEnvelopeMeta
	Result *config.BioEnrollOutput `json:"result,omitempty"`
}

type BioMutationEnvelope struct {
	OperationEnvelopeMeta
	Result *config.BioMutationOutput `json:"result,omitempty"`
}

type ResetFactoryEnvelope struct {
	OperationEnvelopeMeta
	Result *config.ResetFactoryOutput `json:"result,omitempty"`
}

type MakeCredentialEnvelope struct {
	OperationEnvelopeMeta
	Result *webauthn.MakeCredentialOutput `json:"result,omitempty"`
}

type GetAssertionEnvelope struct {
	OperationEnvelopeMeta
	Result *webauthn.GetAssertionOutput `json:"result,omitempty"`
}

type CancelOperationRequest struct {
	OperationID OperationID `json:"operationId"`
}

type InteractionPrompt struct {
	InteractionID InteractionID            `json:"interactionId"`
	OperationID   OperationID              `json:"operationId"`
	SelectionID   SelectionID              `json:"selectionId"`
	Request       model.InteractionRequest `json:"request"`
}

type InteractionAnswer struct {
	InteractionID InteractionID `json:"interactionId"`
	PIN           string        `json:"pin,omitempty"`
	Canceled      bool          `json:"canceled,omitempty"`
}

type OperationEventEnvelope struct {
	OperationID OperationID          `json:"operationId,omitempty"`
	SelectionID SelectionID          `json:"selectionId"`
	Event       model.OperationEvent `json:"event"`
}

type MDSLookupRequest struct {
	AAGUID   string `json:"aaguid"`
	Source   string `json:"source,omitempty"`
	CacheDir string `json:"cacheDir,omitempty"`
	Refresh  bool   `json:"refresh,omitempty"`
}

type MDSLookupEnvelope struct {
	Result appmds.LookupResult `json:"result"`
}
