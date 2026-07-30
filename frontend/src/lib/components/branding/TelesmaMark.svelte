<script lang="ts">
  import telesmaMarkUrl from "$lib/assets/telesma-mark.svg?url";
</script>

<span
  class="telesma-mark"
  style:--telesma-mark-source={`url("${telesmaMarkUrl}")`}
  aria-hidden="true"
></span>

<style>
  @layer blocks {
    .telesma-mark {
      display: block;
      width: 26px;
      height: 26px;
      background: currentColor;
      -webkit-mask-image: var(--telesma-mark-source);
      mask-image: var(--telesma-mark-source);
      -webkit-mask-position: center;
      mask-position: center;
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-size: contain;
      mask-size: contain;
    }
  }
</style>
