import { 
    App, 
    Editor, 
    MarkdownView, 
    Plugin, 
    PluginSettingTab, 
    Setting, 
    TFile,
    Notice,
    Modal
} from 'obsidian';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { format } from 'date-fns';

interface GCalReminderSettings {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}

class DateTimePickerModal extends Modal {
    onSubmit: (result: Date) => void;

    constructor(app: App, onSubmit: (result: Date) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Set Reminder Date and Time' });

        // Create container for the picker
        const pickerContainer = contentEl.createDiv({ cls: 'datetime-picker-container' });
        
        // Create datetime picker
        const dateTimeInput = pickerContainer.createEl('input', {
            type: 'datetime-local',
            cls: 'datetime-input'
        });

        // Set default to next hour
        const now = new Date();
        now.setHours(now.getHours() + 1, 0, 0, 0);
        dateTimeInput.value = now.toISOString().slice(0, 16);

        // Create button container
        const buttonContainer = contentEl.createDiv({ 
            cls: 'datetime-picker-buttons',
            attr: { style: 'margin-top: 20px;' }
        });

        // Create submit button
        const submitBtn = buttonContainer.createEl('button', { 
            text: 'Create Reminder',
            cls: 'mod-cta'
        });
        
        submitBtn.addEventListener('click', () => {
            const selectedDate = new Date(dateTimeInput.value);
            if (!isNaN(selectedDate.getTime())) {
                this.close();
                this.onSubmit(selectedDate);
            } else {
                new Notice('Please select a valid date and time');
            }
        });

        // Add some basic styles
        pickerContainer.style.textAlign = 'center';
        dateTimeInput.style.margin = '20px 0';
        dateTimeInput.style.padding = '8px';
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export default class GCalReminderPlugin extends Plugin {
    settings: GCalReminderSettings;
    googleAuth: OAuth2Client;

    async onload() {
        await this.loadSettings();
        this.setupGoogleAuth();

        // Add command to create reminder
        this.addCommand({
            id: 'add-gcal-reminder',
            name: 'Add Google Calendar Reminder',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        this.showDateTimePicker(markdownView);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add settings tab
        this.addSettingTab(new GCalReminderSettingTab(this.app, this));
    }

    setupGoogleAuth() {
        this.googleAuth = new google.auth.OAuth2(
            this.settings.clientId,
            this.settings.clientSecret
        );
        this.googleAuth.setCredentials({
            refresh_token: this.settings.refreshToken
        });
    }

    showDateTimePicker(markdownView: MarkdownView) {
        new DateTimePickerModal(this.app, async (date) => {
            if (date) {
                await this.createReminderWithBlockLink(date, markdownView);
            }
        }).open();
    }

    async createReminderWithBlockLink(date: Date, markdownView: MarkdownView) {
        const editor = markdownView.editor;
        const file = markdownView.file;

        if (!file) {
            new Notice('No active file');
            return;
        }

        try {
            // Generate a unique block ID
            const blockId = this.generateBlockId();
            
            // Get current cursor position and line content
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            
            // Create Google Calendar event
            const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });
            
            const event = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                    summary: line.trim(),
                    description: `Obsidian Link: ${this.createObsidianUrl(file, blockId)}`,
                    start: {
                        dateTime: date.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    end: {
                        dateTime: new Date(date.getTime() + 30 * 60000).toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                }
            });

            // Format the datetime string
            const formattedDateTime = format(date, 'yyyy-MM-dd HH:mm');

            // Get the calendar URL
            const calendarUrl = event.data.htmlLink || '';
            
            // Update the line with the new format: text ^blockId #reminder (datetime)[gcal_URL]
            const updatedLine = `${line} ^${blockId} #reminder (${formattedDateTime})[${calendarUrl}]`;
            editor.setLine(cursor.line, updatedLine);

            new Notice('Reminder created successfully!');
        } catch (error) {
            console.error('Failed to create reminder:', error);
            new Notice('Failed to create reminder');
        }
    }

    generateBlockId(): string {
        return Math.random().toString(36).substring(2, 8);
    }

    createObsidianUrl(file: TFile, blockId: string): string {
        const fileName = encodeURIComponent(file.path);
        return `obsidian://open?vault=${encodeURIComponent(this.app.vault.getName())}&file=${fileName}&block=${blockId}`;
    }

    async loadSettings() {
        this.settings = Object.assign({
            clientId: '',
            clientSecret: '',
            refreshToken: ''
        }, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class GCalReminderSettingTab extends PluginSettingTab {
    plugin: GCalReminderPlugin;

    constructor(app: App, plugin: GCalReminderPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Google Client ID')
            .setDesc('Client ID from Google Cloud Console')
            .addText(text => text
                .setPlaceholder('Enter client ID')
                .setValue(this.plugin.settings.clientId)
                .onChange(async (value) => {
                    this.plugin.settings.clientId = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Google Client Secret')
            .setDesc('Client Secret from Google Cloud Console')
            .addText(text => text
                .setPlaceholder('Enter client secret')
                .setValue(this.plugin.settings.clientSecret)
                .onChange(async (value) => {
                    this.plugin.settings.clientSecret = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Refresh Token')
            .setDesc('Google OAuth2 refresh token')
            .addText(text => text
                .setPlaceholder('Enter refresh token')
                .setValue(this.plugin.settings.refreshToken)
                .onChange(async (value) => {
                    this.plugin.settings.refreshToken = value;
                    await this.plugin.saveSettings();
                }));
    }
}