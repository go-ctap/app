import Content from "$lib/components/ui/dialog/dialog-content.svelte";
import Description from "$lib/components/ui/dialog/dialog-description.svelte";
import Footer from "$lib/components/ui/dialog/dialog-footer.svelte";
import Header from "$lib/components/ui/dialog/dialog-header.svelte";
import Overlay from "$lib/components/ui/dialog/dialog-overlay.svelte";
import Portal from "$lib/components/ui/dialog/dialog-portal.svelte";
import Title from "$lib/components/ui/dialog/dialog-title.svelte";
import Root from "$lib/components/ui/dialog/dialog.svelte";

export {
  Root,
  Title,
  Portal,
  Footer,
  Header,
  Overlay,
  Content,
  Description,
  //
  Root as Dialog,
  Title as DialogTitle,
  Portal as DialogPortal,
  Footer as DialogFooter,
  Header as DialogHeader,
  Overlay as DialogOverlay,
  Content as DialogContent,
  Description as DialogDescription,
};
