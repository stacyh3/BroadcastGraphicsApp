import fs from 'fs';
import path from 'path';
import { GraphicTemplate, GraphicField } from './models';

export class TemplateService {
    private _templatesPath: string;

    constructor(templatesPath?: string) {
        this._templatesPath = templatesPath || path.join(__dirname, '..', 'assets', 'Templates');
    }

    loadTemplates(): GraphicTemplate[] {
        const templates: GraphicTemplate[] = [];
        if (!fs.existsSync(this._templatesPath)) return templates;

        const dirs = fs.readdirSync(this._templatesPath, { withFileTypes: true })
            .filter(d => d.isDirectory());

        for (const dir of dirs) {
            const dirPath = path.join(this._templatesPath, dir.name);
            const configPath = path.join(dirPath, 'config.json');
            const htmlPath = path.join(dirPath, 'template.html');

            if (fs.existsSync(configPath) && fs.existsSync(htmlPath)) {
                try {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

                    const template: GraphicTemplate = {
                        id: config.id || '',
                        name: config.name || '',
                        layer: config.layer || '',
                        fields: (config.fields || []).map((f: Partial<GraphicField>) => ({
                            id: f.id || '',
                            label: f.label || '',
                            type: f.type || 'text',
                            default: f.default || '',
                            value: f.default || ''
                        })),
                        htmlContent
                    };
                    templates.push(template);
                } catch (err) {
                    console.error(`Error loading template ${dir.name}:`, (err as Error).message);
                }
            }
        }
        return templates;
    }

    renderTemplate(template: GraphicTemplate): string {
        let html = template.htmlContent;
        for (const field of template.fields) {
            let val = field.value || '';
            if (path.isAbsolute(val) && fs.existsSync(val)) {
                val = 'file://' + val.replace(/\\/g, '/');
            }
            html = html.replaceAll(`{{${field.id}}}`, val);
        }
        return html;
    }
}
