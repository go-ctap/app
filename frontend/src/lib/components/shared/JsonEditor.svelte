<script lang="ts">
  import { onMount } from "svelte";

  import type { JSONEditorHandle } from "$lib/json-editor";

  type Props = {
    id: string;
    labelledBy: string;
    value: string;
    minLines?: number;
    disabled?: boolean;
    invalid?: boolean;
    placeholder?: string;
    onChange: (value: string) => void;
  };

  let {
    id,
    labelledBy,
    value,
    minLines = 8,
    disabled = false,
    invalid = false,
    placeholder,
    onChange,
  }: Props = $props();

  let host: HTMLDivElement;
  let editor = $state<JSONEditorHandle | null>(null);

  onMount(() => {
    let disposed = false;

    void import("$lib/json-editor").then(({ createJSONEditor }) => {
      if (disposed) return;

      editor = createJSONEditor({
        parent: host,
        id,
        labelledBy,
        value,
        disabled,
        invalid,
        placeholder,
        onChange,
      });
    });

    return () => {
      disposed = true;
      editor?.destroy();
      editor = null;
    };
  });

  $effect(() => {
    editor?.setValue(value);
  });

  $effect(() => {
    editor?.setConfiguration({ id, labelledBy, placeholder, disabled, invalid });
  });
</script>

<div
  class="json-editor"
  data-disabled={disabled || undefined}
  data-invalid={invalid || undefined}
  style={`--json-editor-min-block-size: ${minLines * 1.25 + 1}rem`}
>
  <div class="json-editor-surface" bind:this={host}></div>
</div>

<style>
  @layer blocks {
    .json-editor {
      --json-editor-property: color-mix(in oklch, var(--sidebar-primary) 78%, var(--foreground));
      --json-editor-string: color-mix(in oklch, var(--warning-foreground) 82%, var(--foreground));
      --json-editor-number: color-mix(in oklch, var(--destructive) 74%, var(--foreground));
      --json-editor-literal: color-mix(
        in oklch longer hue,
        var(--sidebar-primary) 58%,
        var(--destructive)
      );

      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--input);
      background: color-mix(in oklch, var(--card) 88%, var(--background));
      transition:
        border-color 120ms ease,
        box-shadow 120ms ease;
    }

    .json-editor:focus-within {
      border-color: var(--ring);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--ring) 50%, transparent);
    }

    .json-editor-surface {
      min-width: 0;
    }

    .json-editor :global(.cm-editor) {
      color: var(--foreground);
      background: transparent;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      line-height: 1.25rem;
    }

    .json-editor :global(.cm-scroller) {
      overflow-x: auto;
      overflow-y: hidden;
      font-family: inherit;
      line-height: inherit;
    }

    .json-editor :global(.cm-content) {
      min-block-size: var(--json-editor-min-block-size);
      padding-block: var(--space-2);
      caret-color: var(--foreground);
    }

    .json-editor :global(.cm-line) {
      padding-inline: var(--space-2);
    }

    .json-editor :global(.cm-activeLine) {
      background: color-mix(in oklch, var(--primary) 9%, transparent);
    }

    .json-editor :global(.cm-selectionBackground) {
      background: color-mix(in oklch, var(--primary) 26%, transparent) !important;
    }

    .json-editor :global(.cm-content ::selection) {
      background: color-mix(in oklch, var(--primary) 26%, transparent);
    }

    .json-editor :global(.cm-cursor) {
      border-left-color: var(--json-editor-property);
    }

    .json-editor :global(.cm-matchingBracket) {
      color: var(--foreground);
      background: color-mix(in oklch, var(--primary) 18%, transparent);
      outline: 1px solid color-mix(in oklch, var(--primary) 55%, transparent);
    }

    .json-editor :global(.cm-placeholder) {
      color: var(--muted-foreground);
    }

    .json-editor :global(.cm-focused) {
      outline: none;
    }
  }

  @layer exceptions {
    .json-editor[data-invalid] {
      border-color: var(--destructive);
    }

    .json-editor[data-invalid]:focus-within {
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--destructive) 50%, transparent);
    }

    .json-editor[data-disabled] {
      opacity: 0.5;
    }
  }
</style>
