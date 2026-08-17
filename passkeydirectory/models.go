package passkeydirectory

// PasskeySupportMode describes whether one Passkey Directory capability is
// available or mandatory for the listed service.
type PasskeySupportMode string

const (
	PasskeySupportModeAllowed  PasskeySupportMode = "allowed"
	PasskeySupportModeRequired PasskeySupportMode = "required"
)

type PasskeyDirectoryLookupRequest struct {
	RPIDs []string `json:"rpIDs"`
}

type PasskeyDirectoryMatch struct {
	RPID            string              `json:"rpID"`
	CanonicalDomain string              `json:"canonicalDomain"`
	Passwordless    *PasskeySupportMode `json:"passwordless,omitempty"`
	MFA             *PasskeySupportMode `json:"mfa,omitempty"`
	Documentation   string              `json:"documentation,omitempty"`
	Recovery        string              `json:"recovery,omitempty"`
	Notes           string              `json:"notes,omitempty"`
}

type PasskeyDirectoryLookupResult struct {
	Matches []PasskeyDirectoryMatch `json:"matches"`
}
