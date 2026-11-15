import { untrack } from 'svelte';

import { pushState, replaceState } from '$app/navigation';
import { page } from '$app/state';

import type { ToolSection } from './mode-presentation';

type View = NonNullable<App.PageState['hasciiEditor']>;

/** Only actual editor screens enter browser history; settings stay in EditorModel. */
export class MobileNavigation {
  readonly view = $derived(page.state.hasciiEditor);
  private moving = false;
  private destination: (() => void) | undefined;

  constructor() {
    let previous: View | undefined;
    $effect(() => {
      if (previous !== this.view) {
        previous = this.view;
        this.moving = false;
        const destination = this.destination;
        this.destination = undefined;
        if (destination) untrack(destination);
      }
    });
  }

  toggle(section: ToolSection) {
    if (this.moving) {
      this.destination = () => this.toggle(section);
      return;
    }
    if (this.view?.section === section) {
      this.leaveMobile();
      return;
    }
    const state = { ...page.state, hasciiEditor: { section } };
    if (this.view) replaceState('', state);
    else pushState('', state);
  }

  details(detail: NonNullable<View['detail']>) {
    if (this.moving) {
      this.destination = () => this.details(detail);
      return;
    }
    if (!this.view || this.view.detail === detail) return;
    const state = { ...page.state, hasciiEditor: { ...this.view, detail } };
    if (this.view.detail) replaceState('', state);
    else pushState('', state);
  }

  back() {
    if (!this.view || this.moving) return;
    this.moving = true;
    history.back();
  }

  leaveMobile() {
    if (!this.view || this.moving) return;
    this.moving = true;
    history.go(this.view.detail ? -2 : -1);
  }
}
