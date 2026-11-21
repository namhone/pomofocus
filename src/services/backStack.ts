import { useEffect } from 'react';

export interface BackStackItem {
  id: string;
  dismiss: () => void;
  priority?: number;
}

class BackStackManager {
  private stack: BackStackItem[] = [];
  private listeners: Set<() => void> = new Set();

  /**
   * Push an overlay / sheet / modal onto the back stack.
   * Returns an unregister cleanup function.
   */
  push(item: BackStackItem): () => void {
    // Prevent duplicate entries for the same ID
    this.stack = this.stack.filter((i) => i.id !== item.id);
    this.stack.push(item);
    // Sort by priority if specified (higher priority dismissed first)
    if (item.priority !== undefined) {
      this.stack.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    }
    this.notify();
    return () => this.pop(item.id);
  }

  /**
   * Pop an item by ID, or pop the topmost item if no ID is passed.
   */
  pop(id?: string): BackStackItem | undefined {
    let removed: BackStackItem | undefined;
    if (id) {
      const idx = this.stack.findIndex((i) => i.id === id);
      if (idx !== -1) {
        removed = this.stack.splice(idx, 1)[0];
      }
    } else {
      removed = this.stack.pop();
    }
    if (removed) {
      this.notify();
    }
    return removed;
  }

  /**
   * Dismiss the topmost overlay on the stack.
   * Returns true if an overlay was dismissed, false if stack was empty.
   */
  dismissTop(): boolean {
    if (this.stack.length === 0) return false;
    const top = this.stack.pop();
    this.notify();
    if (top && typeof top.dismiss === 'function') {
      try {
        top.dismiss();
      } catch (err) {
        console.warn(`[BackStack] Error dismissing item ${top.id}:`, err);
      }
      return true;
    }
    return false;
  }

  /**
   * Check if any overlays are currently registered in the back stack.
   */
  hasOverlays(): boolean {
    return this.stack.length > 0;
  }

  /**
   * Current number of overlays in the stack.
   */
  get count(): number {
    return this.stack.length;
  }

  /**
   * Get an array of current item IDs (topmost is last).
   */
  getStackIds(): string[] {
    return this.stack.map((i) => i.id);
  }

  /**
   * Clear all items in the stack.
   */
  clear(): void {
    if (this.stack.length > 0) {
      this.stack = [];
      this.notify();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.warn('[BackStack] Listener error:', err);
      }
    });
  }
}

export const backStack = new BackStackManager();

/**
 * React hook to automatically push an overlay to backStack when open,
 * and pop it when closed or unmounted.
 */
export function useBackStackEffect(id: string, isOpen: boolean, dismiss: () => void, priority = 0) {
  useEffect(() => {
    if (!isOpen) return;
    const unregister = backStack.push({ id, dismiss, priority });
    return () => {
      unregister();
    };
  }, [id, isOpen, dismiss, priority]);
}
