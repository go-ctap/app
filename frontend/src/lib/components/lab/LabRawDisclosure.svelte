<script lang="ts">
  import JsonDisclosure from "$lib/components/shared/JsonDisclosure.svelte";

  type Props = {
    title: string;
    value: unknown;
    open?: boolean;
  };

  let { title, value, open = $bindable(false) }: Props = $props();
</script>

<JsonDisclosure {title} {value} bind:open />
