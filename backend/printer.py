from typing import Any, Dict, Optional, Callable
import asyncio
import inspect

from rich.console import Console, Group
from rich.live import Live
from rich.spinner import Spinner
from rich.tree import Tree


class Printer:
    def __init__(self, console: Console, callback: Optional[Callable[[str, str, bool], Any]] = None):
        self.console = console
        self.callback = callback
        self.tree = Tree("")
        self.items: Dict[str, Any] = {}
        self.live = Live(self.tree, console=console, auto_refresh=False)
        self.hide_done_ids: set[str] = set()
        self.live.start()

    def end(self) -> None:
        self.live.refresh()
        self.live.stop()

    def hide_done_checkmark(self, item_id: str) -> None:
        self.hide_done_ids.add(item_id)

    def update_item(
        self, key: str, message: str, is_done: bool = False, hide_checkmark: bool = False
    ) -> None:
        # Call the callback if provided
        if self.callback:
            callback_result = self.callback(key, message, is_done)
            # Handle coroutine by creating a task to run it
            if inspect.iscoroutine(callback_result):
                asyncio.create_task(callback_result)
            
        # If the item already exists, update it
        if key in self.items:
            if is_done and not hide_checkmark:
                message = f"[green]✓[/green] {message}"
            self.items[key].label = message
            self.live.refresh()
            return

        # Otherwise, create a new item
        if is_done and not hide_checkmark:
            display_message = f"[green]✓[/green] {message}"
        else:
            display_message = message
        self.items[key] = self.tree.add(display_message)
        self.live.refresh()

    def mark_item_done(self, key: str) -> None:
        if key not in self.items:
            return
        
        # Mark the item as done in the tree
        current_label = self.items[key].label
        if not current_label.startswith("[green]✓[/green]"):
            self.items[key].label = f"[green]✓[/green] {current_label}"
            self.live.refresh()
            
        # Call the callback if provided
        if self.callback:
            callback_result = self.callback(key, self.items[key].label, True)
            # Handle coroutine by creating a task to run it
            if inspect.iscoroutine(callback_result):
                asyncio.create_task(callback_result)

    def flush(self) -> None:
        renderables: list[Any] = []
        for item_id, (content, is_done) in self.items.items():
            if is_done:
                prefix = "✅ " if item_id not in self.hide_done_ids else ""
                renderables.append(prefix + content)
            else:
                renderables.append(Spinner("dots", text=content))
        self.live.update(Group(*renderables))
