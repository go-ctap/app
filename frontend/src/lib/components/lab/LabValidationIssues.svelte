<script lang="ts">
  import * as Alert from "$lib/components/ui/alert/index.js";
  import type { LabValidationIssue } from "$lib/lab-input";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    issues: LabValidationIssue[];
    severity: "error" | "warning";
  };

  let { issues, severity }: Props = $props();

  function fieldLabel(field: string) {
    if (field.endsWith("rpID")) return m.lab_rp_id();
    if (field.endsWith("rpName")) return m.lab_rp_name();
    if (field.endsWith("userIDHex")) return m.lab_user_id_hex();
    if (field.endsWith("userName")) return m.lab_user_name();
    if (field.endsWith("userDisplayName")) return m.lab_display_name();
    if (field.endsWith("origin")) return m.lab_origin();
    if (field.endsWith("challenge")) return m.lab_challenge();
    if (field.includes("algorithms")) return m.lab_cose_algorithms();
    if (field.includes("excludeList")) return m.lab_exclude_list();
    if (field.includes("allowList")) return m.lab_allow_list();
    if (field.endsWith("rawJSON")) return m.lab_raw_client_data();
    return field;
  }

  function issueMessage(issue: LabValidationIssue) {
    if (issue.code === "required") return m.lab_field_required();
    if (issue.code === "invalid-origin") return m.lab_invalid_origin();
    if (issue.code === "invalid-base64url") return m.lab_invalid_challenge();
    if (issue.code === "invalid-algorithm") return m.lab_invalid_algorithm();
    if (issue.code === "invalid-json") return m.lab_raw_json_warning();
    if (issue.code === "invalid-length") return m.lab_invalid_length();
    if (issue.code === "too-long") return m.lab_value_too_long();
    if (issue.code === "extension-conflict") return m.lab_extension_conflict();
    if (issue.code === "unsupported-prf-credential-selection") return m.lab_prf_single_credential();
    if (issue.field.includes("excludeList") || issue.field.includes("allowList")) {
      return m.lab_invalid_descriptor();
    }
    return m.lab_invalid_hex();
  }
</script>

{#if issues.length}
  <Alert.Root variant={severity === "error" ? "destructive" : "warning"} role={severity === "error" ? "alert" : "status"}>
    <Alert.Title>{severity === "error" ? m.lab_request_failed() : m.lab_preview_warnings()}</Alert.Title>
    <Alert.Description>
      <ul class="lab-validation-list">
        {#each issues as issue, index (`${issue.field}-${issue.code}-${index}`)}
          <li><strong>{fieldLabel(issue.field)}:</strong> {issueMessage(issue)}</li>
        {/each}
      </ul>
    </Alert.Description>
  </Alert.Root>
{/if}

<style>
@layer blocks {
  .lab-validation-list {
    margin: 0;
    padding-inline-start: var(--space-4);
  }
}
</style>
