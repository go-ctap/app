<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";

	import Toaster from "./sonner.svelte";

	let open = $state(true);
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Test dialog</Dialog.Title>
		</Dialog.Header>
		<Button type="button">Dialog action</Button>
	</Dialog.Content>
</Dialog.Root>

<Toaster closeButton duration={60_000} />
