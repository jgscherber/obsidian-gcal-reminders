import { 
    App, 
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
    refreshToken: string | null;
}

class AuthCodeModal extends Modal {
    plugin: GCalReminderPlugin;
    oauth2Client: OAuth2Client;
    authUrl: string;

    constructor(app: App, plugin: GCalReminderPlugin, oauth2Client: OAuth2Client, authUrl: string) {
        super(app);
        this.plugin = plugin;
        this.oauth2Client = oauth2Client;
        this.authUrl = authUrl;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Google Calendar Authentication' });
        
        // Instructions
        const instructions = contentEl.createDiv({ cls: 'auth-instructions' });
        instructions.createEl('p', { text: '1. Click the button below to open Google authentication in your browser' });
        instructions.createEl('p', { text: '2. Complete the authentication process' });
        instructions.createEl('p', { text: '3. Copy the code from the final page' });
        instructions.createEl('p', { text: '4. Paste the code below and click Submit' });

        // Open Auth URL button
        const openAuthButton = contentEl.createEl('button', {
            text: 'Open Authentication Page',
            cls: 'mod-cta'
        });
        openAuthButton.addEventListener('click', () => {
            window.open(this.authUrl);
        });

        // Create input for auth code
        const inputContainer = contentEl.createDiv({ cls: 'auth-input-container' });
        inputContainer.style.marginTop = '20px';
        const authCodeInput = inputContainer.createEl('input', {
            type: 'text',
            placeholder: 'Paste authentication code here'
        });

        // Create submit button
        const submitButton = contentEl.createEl('button', {
            text: 'Submit',
            cls: 'mod-cta'
        });
        submitButton.style.marginTop = '10px';
        
        submitButton.addEventListener('click', async () => {
            const code = authCodeInput.value.trim();
            if (!code) {
                new Notice('Please enter the authentication code');
                return;
            }

            try {
                const { tokens } = await this.oauth2Client.getToken(code);
                if (tokens.refresh_token) {
                    this.plugin.settings.refreshToken = tokens.refresh_token;
                    await this.plugin.saveSettings();
                    this.plugin.setupGoogleAuth();
                    new Notice('Successfully authenticated with Google Calendar!');
                    this.close();
                } else {
                    new Notice('No refresh token received. Please try again.');
                }
            } catch (error) {
                console.error('Error getting tokens:', error);
                new Notice('Failed to authenticate. Please try again.');
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
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
        
        if (this.settings.clientId && this.settings.clientSecret && this.settings.refreshToken) {
            this.setupGoogleAuth();
        }

        // Add command to create reminder
        this.addCommand({
            id: 'add-gcal-reminder',
            name: 'Add Google Calendar Reminder',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        if (!this.settings.refreshToken) {
                            new Notice('Please authenticate with Google Calendar in settings first');
                            return;
                        }
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
            this.settings.clientSecret,
            'urn:ietf:wg:oauth:2.0:oob'  // For manual copy/paste flow
        );
        
        if (this.settings.refreshToken) {
            this.googleAuth.setCredentials({
                refresh_token: this.settings.refreshToken
            });
        }
    }

    initiateAuth() {
        const oauth2Client = new google.auth.OAuth2(
            this.settings.clientId,
            this.settings.clientSecret,
            'urn:ietf:wg:oauth:2.0:oob'  // For manual copy/paste flow
        );

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar'],
            prompt: 'consent'
        });

        new AuthCodeModal(this.app, this, oauth2Client, authUrl).open();
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
                    description: this.createObsidianUrl(file, blockId),
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
            
            // Update the line with the new format: text #reminder [datetime](gcal_URL) ^blockId
            const updatedLine = `${line} #reminder [${formattedDateTime}](${calendarUrl}) ^${blockId}`;
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
        // Get the file path and encode the entire path including any # symbols
        const filePath = file.path.replace(/#/g, '%23');
        
        // Create the URL with the block reference
        return `obsidian://open?vault=${encodeURIComponent(this.app.vault.getName())}&file=${filePath}%23%5E${blockId}`;
    }

    async loadSettings() {
        this.settings = Object.assign({
            clientId: '',
            clientSecret: '',
            refreshToken: null
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
            .setName('Authentication')
            .setDesc('Connect to Google Calendar')
            .addButton(button => button
                .setButtonText(this.plugin.settings.refreshToken ? 'Re-authenticate' : 'Connect to Google Calendar')
                .onClick(() => {
                    if (this.plugin.settings.clientId && this.plugin.settings.clientSecret) {
                        this.plugin.initiateAuth();
                    } else {
                        new Notice('Please enter Client ID and Client Secret first');
                    }
                }));
    }
}