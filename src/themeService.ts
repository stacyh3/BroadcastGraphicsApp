import { ThemeSettings, createDefaultTheme } from './models';

export class ThemeService {
    currentTheme: ThemeSettings;

    constructor() {
        this.currentTheme = createDefaultTheme();
    }

    updateTheme(newSettings: Partial<ThemeSettings>): void {
        this.currentTheme = { ...this.currentTheme, ...newSettings };
    }

    generateCssVariables(): string {
        const t = this.currentTheme;
        return `:root { --primary-color: ${t.primaryColor}; --secondary-color: ${t.secondaryColor}; --text-color: ${t.textColor}; --font-family: ${t.fontFamily}; }`;
    }
}
