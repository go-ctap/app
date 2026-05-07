<script lang="ts">
  export let label = "";
  export let value: unknown = "";
</script>

<div class="meta-row">
  <span>{label}</span>
  <strong>{value || "unknown"}</strong>
</div>
