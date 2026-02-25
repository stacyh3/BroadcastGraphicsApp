import fs from 'fs';
import { RundownItem, createRundownItem } from './models';

type RundownListener = (items: RundownItem[]) => void;

export class RundownService {
    items: RundownItem[] = [];
    private _listeners: RundownListener[] = [];

    onChange(fn: RundownListener): void {
        this._listeners.push(fn);
    }

    private _notify(): void {
        for (const fn of this._listeners) fn(this.items);
    }

    addItem(templateId: string, name: string, fieldValues: Record<string, string> = {}): RundownItem {
        const item = createRundownItem(templateId, name, fieldValues);
        this.items.push(item);
        this._notify();
        return item;
    }

    removeItem(id: string): void {
        this.items = this.items.filter(i => i.id !== id);
        this._notify();
    }

    moveItem(oldIndex: number, newIndex: number): void {
        if (oldIndex < 0 || oldIndex >= this.items.length) return;
        if (newIndex < 0 || newIndex >= this.items.length) return;
        const [item] = this.items.splice(oldIndex, 1);
        this.items.splice(newIndex, 0, item);
        this._notify();
    }

    setActive(id: string, active: boolean): void {
        const item = this.items.find(i => i.id === id);
        if (item) {
            item.isActive = active;
            this._notify();
        }
    }

    updateFieldValues(id: string, fieldValues: Record<string, string>): void {
        const item = this.items.find(i => i.id === id);
        if (item) {
            item.fieldValues = { ...fieldValues };
            this._notify();
        }
    }

    renameItem(id: string, newName: string): void {
        const item = this.items.find(i => i.id === id);
        if (item) {
            item.name = newName;
            this._notify();
        }
    }

    replaceAll(newItems: RundownItem[]): void {
        this.items = newItems;
        this._notify();
    }

    saveRundown(filePath: string): void {
        fs.writeFileSync(filePath, JSON.stringify(this.items, null, 2), 'utf-8');
    }

    loadRundown(filePath: string): void {
        if (!fs.existsSync(filePath)) return;
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (Array.isArray(data)) {
            this.items = data;
            this._notify();
        }
    }
}
