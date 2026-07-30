import Root from "$lib/components/ui/sheet/sheet.svelte";
import Portal from "$lib/components/ui/sheet/sheet-portal.svelte";
import Close from "$lib/components/ui/sheet/sheet-close.svelte";
import Overlay from "$lib/components/ui/sheet/sheet-overlay.svelte";
import Content from "$lib/components/ui/sheet/sheet-content.svelte";
import Header from "$lib/components/ui/sheet/sheet-header.svelte";
import Title from "$lib/components/ui/sheet/sheet-title.svelte";
import Description from "$lib/components/ui/sheet/sheet-description.svelte";

export {
  Root,
  Close,
  Portal,
  Overlay,
  Content,
  Header,
  Title,
  Description,
  //
  Root as Sheet,
  Close as SheetClose,
  Portal as SheetPortal,
  Overlay as SheetOverlay,
  Content as SheetContent,
  Header as SheetHeader,
  Title as SheetTitle,
  Description as SheetDescription,
};
