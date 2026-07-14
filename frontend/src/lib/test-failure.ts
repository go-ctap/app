import {
  Category,
  Code,
  Failure,
} from "../../bindings/github.com/go-ctap/kit/model/failure";

const TEST_CATEGORY_BY_CODE: Partial<Record<Code, Category>> = {
  [Code.CodeAssertionDenied]: Category.CategoryInvalidState,
  [Code.CodeBioInteractionTimeout]: Category.CategoryTimeout,
  [Code.CodeConfirmationRequired]: Category.CategoryInvalidOperation,
  [Code.CodeCredentialCreationDenied]: Category.CategoryInvalidState,
  [Code.CodeCredentialManagementUnsupported]: Category.CategoryUnsupported,
  [Code.CodeDeviceBusy]: Category.CategoryBusy,
  [Code.CodeInternalError]: Category.CategoryInternal,
  [Code.CodeLargeBlobArrayTooLarge]: Category.CategoryInvalidState,
  [Code.CodeLargeBlobMissing]: Category.CategoryInvalidState,
  [Code.CodeLargeBlobUTF8Invalid]: Category.CategoryInvalidState,
  [Code.CodeMDSFetchFailed]: Category.CategoryTransportFailure,
  [Code.CodeOperationCanceled]: Category.CategoryCanceled,
  [Code.CodeOperationTimeout]: Category.CategoryTimeout,
  [Code.CodeOperationUnsupported]: Category.CategoryUnsupported,
  [Code.CodePINInvalid]: Category.CategoryInvalidState,
  [Code.CodeResetTouchTimeout]: Category.CategoryTimeout,
  [Code.CodeResetWindowExpired]: Category.CategoryInvalidState,
  [Code.CodeSessionInvalid]: Category.CategoryInvalidSession,
  [Code.CodeTransportFailure]: Category.CategoryTransportFailure,
  [Code.CodeVerificationFlowUnsupported]: Category.CategoryUnsupported,
};

export function failureForCode(code: Code): Failure {
  const category = TEST_CATEGORY_BY_CODE[code];
  if (!category) throw new Error(`missing failure fixture category for ${code}`);
  return new Failure({ code, category });
}
