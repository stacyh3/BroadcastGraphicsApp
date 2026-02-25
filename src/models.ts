export interface GraphicField {
    id: string;
    label: string;
    type: 'text' | 'file' | 'score';
    default: string;
    value: string;
}

export interface GraphicTemplate {
    id: string;
    name: string;
    layer: string;
    fields: GraphicField[];
    htmlContent: string;
}

export interface RundownItem {
    id: string;
    templateId: string;
    name: string;
    isActive: boolean;
    fieldValues: Record<string, string>;
}

export interface ThemeSettings {
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    fontFamily: string;
}

export function createRundownItem(templateId: string, name: string, fieldValues: Record<string, string> = {}): RundownItem {
    return {
        id: crypto.randomUUID(),
        templateId,
        name,
        isActive: false,
        fieldValues: { ...fieldValues }
    };
}

export function createDefaultTheme(): ThemeSettings {
    return {
        primaryColor: '#00008B',
        secondaryColor: '#FFD700',
        textColor: '#FFFFFF',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    };
}
