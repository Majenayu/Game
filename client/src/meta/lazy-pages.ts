import type { Ui } from '../ui/ui';
import type { Progress } from './economy';
import type { PageActions, PageName, Pages } from './pages';

/** Keep the optional catalogs and page builders off the zero-click tutorial path. */
export class LazyPages {
  private loaded?: Pages;
  private loading?: Promise<Pages>;
  private requested: PageName | null = null;
  private generation = 0;
  constructor(private ui: Ui, private pr: Progress, private actions: PageActions) {}
  get current(): PageName | null { return this.loaded?.current ?? this.requested; }
  open(name: PageName): void {
    this.requested = name;
    const generation = ++this.generation;
    this.loading ??= import('./pages').then(({ Pages }) => {
      this.loaded = new Pages(this.ui, this.pr, this.actions);
      return this.loaded;
    }).catch(error => {
      this.loading = undefined;
      throw error;
    });
    void this.loading.then(pages => {
      if (generation === this.generation) pages.open(name);
    }).catch(() => {
      if (generation !== this.generation) return;
      this.requested = null;
      this.ui.showOverlay('This page could not load. Check your connection and try again.', [
        { label: 'Retry', onClick: () => { this.ui.hideOverlay(); this.open(name); } },
        { label: 'Back', ghost: true, onClick: () => this.ui.hideOverlay() },
      ]);
    });
  }
  close(): void {
    this.generation++;
    this.requested = null;
    this.loaded?.close();
  }
  render(): void { this.loaded?.render(); }
}
