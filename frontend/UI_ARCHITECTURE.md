# Frontend UI Architecture

`shadcn-svelte` is the primitive layer for accessible UI behavior. Use `frontend/components.json` as the source of truth for registry, aliases, style, icon library, and Tailwind configuration. Add primitives with the shadcn CLI and then customize the generated local files intentionally.

Generated shadcn primitives live under `frontend/src/lib/components/ui/`. These files may use Tailwind utility classes and internal Bits UI primitives because that is how shadcn-svelte distributes accessible open-code components. Product code outside this directory must not import `bits-ui` directly.

Product and workbench components live under grouped folders in `frontend/src/lib/components/`; screens live under `frontend/src/screens/`. Screens compose product/workbench components and should not call generated Wails bindings directly. App state, controllers, typed result extractors, and operation handling stay under `frontend/src/lib/`, but `frontend/src/lib/` must not contain local DTO mirrors.

Lyra is the visual baseline. Product CSS should not create a parallel custom theme; it should mainly provide layout, Wails shell sizing, density, and domain state hooks. Keep global CSS organized by the existing CUBE layers in `frontend/src/app.css` and `frontend/src/styles/`: tokens/base first, then Composition, Utility, Block, and Exception. Use `data-*` attributes for real state and variant exceptions.

Use Tailwind utility composition mainly inside generated shadcn primitives or very small UI wrappers. For larger product surfaces, prefer shadcn primitives and product class names that express layout or domain state, while inheriting color, radius, typography, and interaction styling from Lyra.
