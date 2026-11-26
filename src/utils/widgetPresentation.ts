import { WidgetState } from '../types/layout';

/** A conservative scrim protects text even against a completely white image. */
export function widgetScrimOpacity(hasImage: boolean, brightness: number, preferred: number): number {
  const floor = hasImage ? (brightness > 110 ? 0.96 : 0.92) : 0.88;
  return Math.min(0.98, Math.max(floor, preferred / 100));
}

/** Presentation only: closing the drawer restores saved placement without storage writes. */
export function notesBesideDrawer(note: WidgetState, widgets: Record<string, WidgetState>, width: number, height: number): WidgetState {
  const drawerWidth = width >= 1280 ? 420 : width >= 1024 ? 380 : 360;
  const rightEdge = width - drawerWidth - 24;
  if (note.x + note.width <= rightEdge) return note;
  const row = [widgets.timer, widgets.tasks].filter(widget => widget?.isOpen);
  const bottom = Math.max(76, ...row.map(widget => widget.y + (widget.isCollapsed ? 108 : Math.min(320, widget.height))));
  const top = bottom + 16;
  return { ...note, x: Math.max(16, Math.min(note.x, row[0]?.x || 24, rightEdge - note.width)), y: top, height: Math.max(128, Math.min(note.height, height - 112 - top)) };
}
