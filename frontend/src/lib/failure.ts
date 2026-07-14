import {
  Category,
  Code,
  Failure,
} from "../../bindings/github.com/go-ctap/kit/model/failure";

import { m } from "../paraglide/messages.js";

type Message = () => string;
type KnownCategory = Exclude<Category, Category.$zero>;

const CODES_BY_CATEGORY = {
  [Category.CategoryInternal]: [
    Code.CodeInternalError,
  ],
  [Category.CategoryUnsupported]: [
    Code.CodeOperationUnsupported,
    Code.CodeVerificationFlowUnsupported,
    Code.CodeTransportModeUnsupported,
    Code.CodeCredentialManagementUnsupported,
    Code.CodePINUnsupported,
    Code.CodeBioUnsupported,
    Code.CodeAuthenticatorConfigUnsupported,
    Code.CodeMinPINLengthUnsupported,
    Code.CodeLargeBlobUnsupported,
    Code.CodeLargeBlobDecodeModeUnsupported,
    Code.CodeCTAPCommandInvalid,
    Code.CodeAlgorithmUnsupported,
    Code.CodeCTAPOptionUnsupported,
    Code.CodeCTAPSubcommandInvalid,
    Code.CodeGetInfoUnsupported,
  ],
  [Category.CategoryPermissionDenied]: [
    Code.CodeTransportPermissionDenied,
  ],
  [Category.CategoryTransportFailure]: [
    Code.CodeTransportProxyUnavailable,
    Code.CodeTransportFailure,
    Code.CodeMDSFetchFailed,
    Code.CodeCTAPSequenceInvalid,
    Code.CodeCTAPLockRequired,
    Code.CodeCTAPChannelInvalid,
    Code.CodeCTAPIntegrityFailure,
    Code.CodeCTAPOtherError,
    Code.CodeCTAPReservedStatus,
    Code.CodeCTAPExtensionError,
    Code.CodeCTAPVendorError,
  ],
  [Category.CategoryTimeout]: [
    Code.CodeOperationTimeout,
    Code.CodeResetTouchTimeout,
    Code.CodeAuthenticatorTimeout,
    Code.CodeUserActionTimeout,
    Code.CodeAuthenticatorActionTimeout,
    Code.CodeAuthenticatorSelectionTimeout,
    Code.CodeBioInteractionTimeout,
  ],
  [Category.CategoryBusy]: [
    Code.CodeDeviceBusy,
    Code.CodeAuthenticatorBusy,
    Code.CodeAuthenticatorProcessing,
    Code.CodeUserActionPending,
    Code.CodeAuthenticatorOperationPending,
  ],
  [Category.CategoryInvalidSession]: [
    Code.CodeSessionInvalid,
    Code.CodeSessionClosed,
  ],
  [Category.CategoryCanceled]: [
    Code.CodeOperationCanceled,
    Code.CodeInteractionCanceled,
    Code.CodeAuthenticatorOperationCanceled,
    Code.CodeAuthenticatorSelectionCanceled,
  ],
  [Category.CategoryInvalidOperation]: [
    Code.CodeOperationRequired,
    Code.CodeRequestJSONInvalid,
    Code.CodeConfirmationRequired,
    Code.CodeInteractionKindRequired,
    Code.CodeInteractionHandlerRequired,
    Code.CodeDeviceHandleInvalid,
    Code.CodeDeviceSelectionRequired,
    Code.CodeMDSAAGUIDInvalid,
    Code.CodeConformanceTargetInvalid,
    Code.CodeRelyingPartyIDRequired,
    Code.CodeUserIDRequired,
    Code.CodeClientDataJSONRequired,
    Code.CodePublicKeyCredentialParametersRequired,
    Code.CodePublicKeyCredentialAlgorithmRequired,
    Code.CodeCredentialIDRequired,
    Code.CodeCredentialChangesRequired,
    Code.CodeUserIDHexInvalid,
    Code.CodePINRequired,
    Code.CodeBioTemplateIDRequired,
    Code.CodeBioTemplateIDInvalid,
    Code.CodeLargeBlobArrayInvalid,
    Code.CodeLargeBlobWriteSequenceInvalid,
    Code.CodeCTAPParameterInvalid,
    Code.CodeCTAPLengthInvalid,
    Code.CodeCTAPCBORTypeInvalid,
    Code.CodeCTAPCBORInvalid,
    Code.CodeCTAPParameterMissing,
    Code.CodeCTAPLimitExceeded,
    Code.CodeCTAPOptionInvalid,
    Code.CodeCTAPRequestTooLarge,
  ],
  [Category.CategoryInvalidState]: [
    Code.CodeServiceClosed,
    Code.CodeDeviceNotFound,
    Code.CodeDeviceUnavailable,
    Code.CodeMDSVerificationFailed,
    Code.CodeCredentialNotFound,
    Code.CodeCredentialExcluded,
    Code.CodeCredentialStoreFull,
    Code.CodeAttestedCredentialDataMissing,
    Code.CodeCredentialCreationDenied,
    Code.CodeAssertionDenied,
    Code.CodeAssertionNotAllowed,
    Code.CodeAssertionContinuationUnavailable,
    Code.CodePINAlreadyConfigured,
    Code.CodePINNotConfigured,
    Code.CodePINInvalid,
    Code.CodePINBlocked,
    Code.CodePINUVAuthInvalid,
    Code.CodePINUVAuthBlocked,
    Code.CodePINPolicyViolation,
    Code.CodePINUVAuthTokenRequired,
    Code.CodePINUVPermissionUnauthorized,
    Code.CodeUserPresenceRequired,
    Code.CodeUserVerificationBlocked,
    Code.CodeUserVerificationInvalid,
    Code.CodeBioNoEnrollments,
    Code.CodeBioEnrollmentNotFound,
    Code.CodeBioDatabaseFull,
    Code.CodeAuthenticatorConfigStorageFull,
    Code.CodeAuthenticatorOperationDenied,
    Code.CodeAuthenticatorOperationNotAllowed,
    Code.CodeAlwaysUVStateUnknown,
    Code.CodeAlwaysUVAlreadyTarget,
    Code.CodeMinPINLengthDecreaseNotAllowed,
    Code.CodeResetWindowExpired,
    Code.CodeLargeBlobKeyMissing,
    Code.CodeLargeBlobArrayTooLarge,
    Code.CodeLargeBlobStorageFull,
    Code.CodeLargeBlobIntegrityFailure,
    Code.CodeLargeBlobMissing,
    Code.CodeLargeBlobUTF8Invalid,
    Code.CodeLargeBlobJSONInvalid,
    Code.CodeLargeBlobCBORInvalid,
    Code.CodeCredentialInvalid,
    Code.CodeAuthenticatorNoOperations,
  ],
} satisfies Record<KnownCategory, readonly Code[]>;

const CODE_MESSAGES: Record<Exclude<Code, Code.$zero>, Message> = {
  [Code.CodeInternalError]: m.failure_internal_error,
  [Code.CodeOperationRequired]: m.failure_operation_required,
  [Code.CodeOperationUnsupported]: m.failure_operation_unsupported,
  [Code.CodeOperationCanceled]: m.failure_operation_canceled,
  [Code.CodeOperationTimeout]: m.failure_operation_timeout,
  [Code.CodeRequestJSONInvalid]: m.failure_request_json_invalid,
  [Code.CodeConfirmationRequired]: m.failure_confirmation_required,
  [Code.CodeVerificationFlowUnsupported]: m.failure_verification_flow_unsupported,
  [Code.CodeInteractionKindRequired]: m.failure_interaction_kind_required,
  [Code.CodeInteractionHandlerRequired]: m.failure_interaction_handler_required,
  [Code.CodeInteractionCanceled]: m.failure_interaction_canceled,
  [Code.CodeSessionInvalid]: m.failure_session_invalid,
  [Code.CodeSessionClosed]: m.failure_session_closed,
  [Code.CodeServiceClosed]: m.failure_service_closed,
  [Code.CodeDeviceHandleInvalid]: m.failure_device_handle_invalid,
  [Code.CodeDeviceNotFound]: m.failure_device_not_found,
  [Code.CodeDeviceSelectionRequired]: m.failure_device_selection_required,
  [Code.CodeDeviceUnavailable]: m.failure_device_unavailable,
  [Code.CodeDeviceBusy]: m.failure_device_busy,
  [Code.CodeTransportModeUnsupported]: m.failure_transport_mode_unsupported,
  [Code.CodeTransportPermissionDenied]: m.failure_transport_permission_denied,
  [Code.CodeTransportProxyUnavailable]: m.failure_transport_proxy_unavailable,
  [Code.CodeTransportFailure]: m.failure_transport_failure,
  [Code.CodeMDSAAGUIDInvalid]: m.failure_mds_aaguid_invalid,
  [Code.CodeMDSFetchFailed]: m.failure_mds_fetch_failed,
  [Code.CodeMDSVerificationFailed]: m.failure_mds_verification_failed,
  [Code.CodeConformanceTargetInvalid]: m.failure_conformance_target_invalid,
  [Code.CodeRelyingPartyIDRequired]: m.failure_relying_party_id_required,
  [Code.CodeUserIDRequired]: m.failure_user_id_required,
  [Code.CodeClientDataJSONRequired]: m.failure_client_data_json_required,
  [Code.CodePublicKeyCredentialParametersRequired]: m.failure_public_key_credential_parameters_required,
  [Code.CodePublicKeyCredentialAlgorithmRequired]: m.failure_public_key_credential_algorithm_required,
  [Code.CodeCredentialIDRequired]: m.failure_credential_id_required,
  [Code.CodeCredentialNotFound]: m.failure_credential_not_found,
  [Code.CodeCredentialExcluded]: m.failure_credential_excluded,
  [Code.CodeCredentialStoreFull]: m.failure_credential_store_full,
  [Code.CodeCredentialManagementUnsupported]: m.failure_credential_management_unsupported,
  [Code.CodeCredentialChangesRequired]: m.failure_credential_changes_required,
  [Code.CodeUserIDHexInvalid]: m.failure_user_id_hex_invalid,
  [Code.CodeAttestedCredentialDataMissing]: m.failure_attested_credential_data_missing,
  [Code.CodeCredentialCreationDenied]: m.failure_credential_creation_denied,
  [Code.CodeAssertionDenied]: m.failure_assertion_denied,
  [Code.CodeAssertionNotAllowed]: m.failure_assertion_not_allowed,
  [Code.CodeAssertionContinuationUnavailable]: m.failure_assertion_continuation_unavailable,
  [Code.CodePINUnsupported]: m.failure_pin_unsupported,
  [Code.CodePINAlreadyConfigured]: m.failure_pin_already_configured,
  [Code.CodePINNotConfigured]: m.failure_pin_not_configured,
  [Code.CodePINRequired]: m.failure_pin_required,
  [Code.CodePINInvalid]: m.failure_pin_invalid,
  [Code.CodePINBlocked]: m.failure_pin_blocked,
  [Code.CodePINUVAuthInvalid]: m.failure_pin_uv_auth_invalid,
  [Code.CodePINUVAuthBlocked]: m.failure_pin_uv_auth_blocked,
  [Code.CodePINPolicyViolation]: m.failure_pin_policy_violation,
  [Code.CodePINUVAuthTokenRequired]: m.failure_pin_uv_auth_token_required,
  [Code.CodePINUVPermissionUnauthorized]: m.failure_pin_uv_permission_unauthorized,
  [Code.CodeUserPresenceRequired]: m.failure_user_presence_required,
  [Code.CodeUserVerificationBlocked]: m.failure_user_verification_blocked,
  [Code.CodeUserVerificationInvalid]: m.failure_user_verification_invalid,
  [Code.CodeBioUnsupported]: m.failure_bio_unsupported,
  [Code.CodeBioTemplateIDRequired]: m.failure_bio_template_id_required,
  [Code.CodeBioTemplateIDInvalid]: m.failure_bio_template_id_invalid,
  [Code.CodeBioNoEnrollments]: m.failure_bio_no_enrollments,
  [Code.CodeBioEnrollmentNotFound]: m.failure_bio_enrollment_not_found,
  [Code.CodeBioDatabaseFull]: m.failure_bio_database_full,
  [Code.CodeAuthenticatorConfigUnsupported]: m.failure_authenticator_config_unsupported,
  [Code.CodeAuthenticatorConfigStorageFull]: m.failure_authenticator_config_storage_full,
  [Code.CodeAuthenticatorOperationDenied]: m.failure_authenticator_operation_denied,
  [Code.CodeAuthenticatorOperationNotAllowed]: m.failure_authenticator_operation_not_allowed,
  [Code.CodeAlwaysUVStateUnknown]: m.failure_always_uv_state_unknown,
  [Code.CodeAlwaysUVAlreadyTarget]: m.failure_always_uv_already_target,
  [Code.CodeMinPINLengthUnsupported]: m.failure_min_pin_length_unsupported,
  [Code.CodeMinPINLengthDecreaseNotAllowed]: m.failure_min_pin_length_decrease_not_allowed,
  [Code.CodeResetWindowExpired]: m.failure_reset_window_expired,
  [Code.CodeResetTouchTimeout]: m.failure_reset_touch_timeout,
  [Code.CodeLargeBlobUnsupported]: m.failure_large_blob_unsupported,
  [Code.CodeLargeBlobKeyMissing]: m.failure_large_blob_key_missing,
  [Code.CodeLargeBlobArrayTooLarge]: m.failure_large_blob_array_too_large,
  [Code.CodeLargeBlobStorageFull]: m.failure_large_blob_storage_full,
  [Code.CodeLargeBlobArrayInvalid]: m.failure_large_blob_array_invalid,
  [Code.CodeLargeBlobWriteSequenceInvalid]: m.failure_large_blob_write_sequence_invalid,
  [Code.CodeLargeBlobIntegrityFailure]: m.failure_large_blob_integrity_failure,
  [Code.CodeLargeBlobMissing]: m.failure_large_blob_missing,
  [Code.CodeLargeBlobUTF8Invalid]: m.failure_large_blob_utf8_invalid,
  [Code.CodeLargeBlobJSONInvalid]: m.failure_large_blob_json_invalid,
  [Code.CodeLargeBlobCBORInvalid]: m.failure_large_blob_cbor_invalid,
  [Code.CodeLargeBlobDecodeModeUnsupported]: m.failure_large_blob_decode_mode_unsupported,
  [Code.CodeCTAPCommandInvalid]: m.failure_ctap_command_invalid,
  [Code.CodeCTAPParameterInvalid]: m.failure_ctap_parameter_invalid,
  [Code.CodeCTAPLengthInvalid]: m.failure_ctap_length_invalid,
  [Code.CodeCTAPSequenceInvalid]: m.failure_ctap_sequence_invalid,
  [Code.CodeAuthenticatorTimeout]: m.failure_authenticator_timeout,
  [Code.CodeAuthenticatorBusy]: m.failure_authenticator_busy,
  [Code.CodeCTAPLockRequired]: m.failure_ctap_lock_required,
  [Code.CodeCTAPChannelInvalid]: m.failure_ctap_channel_invalid,
  [Code.CodeCTAPCBORTypeInvalid]: m.failure_ctap_cbor_type_invalid,
  [Code.CodeCTAPCBORInvalid]: m.failure_ctap_cbor_invalid,
  [Code.CodeCTAPParameterMissing]: m.failure_ctap_parameter_missing,
  [Code.CodeCTAPLimitExceeded]: m.failure_ctap_limit_exceeded,
  [Code.CodeAuthenticatorProcessing]: m.failure_authenticator_processing,
  [Code.CodeCredentialInvalid]: m.failure_credential_invalid,
  [Code.CodeUserActionPending]: m.failure_user_action_pending,
  [Code.CodeAuthenticatorOperationPending]: m.failure_authenticator_operation_pending,
  [Code.CodeAuthenticatorNoOperations]: m.failure_authenticator_no_operations,
  [Code.CodeAlgorithmUnsupported]: m.failure_algorithm_unsupported,
  [Code.CodeCTAPOptionUnsupported]: m.failure_ctap_option_unsupported,
  [Code.CodeCTAPOptionInvalid]: m.failure_ctap_option_invalid,
  [Code.CodeAuthenticatorOperationCanceled]: m.failure_authenticator_operation_canceled,
  [Code.CodeUserActionTimeout]: m.failure_user_action_timeout,
  [Code.CodeCTAPRequestTooLarge]: m.failure_ctap_request_too_large,
  [Code.CodeAuthenticatorActionTimeout]: m.failure_authenticator_action_timeout,
  [Code.CodeCTAPIntegrityFailure]: m.failure_ctap_integrity_failure,
  [Code.CodeCTAPSubcommandInvalid]: m.failure_ctap_subcommand_invalid,
  [Code.CodeCTAPOtherError]: m.failure_ctap_other_error,
  [Code.CodeCTAPReservedStatus]: m.failure_ctap_reserved_status,
  [Code.CodeCTAPExtensionError]: m.failure_ctap_extension_error,
  [Code.CodeCTAPVendorError]: m.failure_ctap_vendor_error,
  [Code.CodeGetInfoUnsupported]: m.failure_get_info_unsupported,
  [Code.CodeAuthenticatorSelectionTimeout]: m.failure_authenticator_selection_timeout,
  [Code.CodeAuthenticatorSelectionCanceled]: m.failure_authenticator_selection_canceled,
  [Code.CodeBioInteractionTimeout]: m.failure_bio_interaction_timeout,
};

const CATEGORY_BY_CODE = new Map<Code, KnownCategory>();
for (const [category, codes] of Object.entries(CODES_BY_CATEGORY) as [KnownCategory, readonly Code[]][]) {
  for (const code of codes) {
    if (CATEGORY_BY_CODE.has(code)) throw new Error(`duplicate failure code: ${code}`);
    CATEGORY_BY_CODE.set(code, category);
  }
}

const KNOWN_CODES = Object.values(Code).filter((code) => code !== Code.$zero);
if (CATEGORY_BY_CODE.size !== KNOWN_CODES.length || KNOWN_CODES.some((code) => !CATEGORY_BY_CODE.has(code))) {
  throw new Error("failure code registry is incomplete");
}

const KNOWN_CODE_SET = new Set<Code>(KNOWN_CODES);

export function runtimeFailureFrom(error: unknown): Failure {
  if (error instanceof Failure) return failureForCode(error.code);

  if (error instanceof Error) {
    const cause = failureCause(error.cause);
    if (cause) return cause;

    const code = knownCode(error.message);
    if (code) return failureForCode(code);
  }

  return failureForCode(Code.CodeInternalError);
}

export function failureForCode(code: Code): Failure {
  const canonicalCode = knownCode(code) ?? Code.CodeInternalError;

  return new Failure({
    code: canonicalCode,
    category: categoryForCode(canonicalCode),
  });
}

export function failureMessage(failure: Failure): string;
export function failureMessage(failure: Failure | null | undefined): string | null;
export function failureMessage(failure: Failure | null | undefined): string | null {
  if (!failure) return null;

  const code = knownCode(failure.code) ?? Code.CodeInternalError;
  return CODE_MESSAGES[code as Exclude<Code, Code.$zero>]();
}

export function isCanceledFailure(failure: Failure | null | undefined): boolean {
  return failure?.category === Category.CategoryCanceled;
}

export function isInvalidSessionFailure(failure: Failure | null | undefined): boolean {
  return failure?.category === Category.CategoryInvalidSession;
}

export function isRetryableFailure(failure: Failure | null | undefined): boolean {
  return failure?.category === Category.CategoryTransportFailure
    || failure?.category === Category.CategoryTimeout
    || failure?.category === Category.CategoryBusy;
}

export function isUnsupportedFailure(failure: Failure | null | undefined): boolean {
  return failure?.category === Category.CategoryUnsupported;
}

function failureCause(value: unknown): Failure | null {
  if (value instanceof Failure) return failureForCode(value.code);
  if (!value || typeof value !== "object") return null;

  const code = knownCode((value as { code?: unknown }).code);
  if (!code) return null;

  return failureForCode(code);
}

function categoryForCode(code: Code): KnownCategory {
  return CATEGORY_BY_CODE.get(code) ?? Category.CategoryInternal;
}

function knownCode(value: unknown): Code | null {
  return typeof value === "string" && KNOWN_CODE_SET.has(value as Code) ? value as Code : null;
}
