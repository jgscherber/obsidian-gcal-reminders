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
import { AuthCodeModal } from 'views/AuthCodeModal'
import { IGoogleCalendarPluginSettings } from 'types/IGoogleCalendarPluginSettings';


interface GCalReminderSettings {
    clientId: string;
    clientSecret: string;
    refreshToken: string | null;
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
    settings: IGoogleCalendarPluginSettings;
    googleAuth: OAuth2Client;

    async onload() {
        await this.loadSettings();
        
        if (this.settings.googleClientId
            && this.settings.googleClientSecret
            && this.settings.googleRefreshToken) {
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
                        if (!this.settings.googleRefreshToken) {
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
            this.settings.googleClientId,
            this.settings.googleClientSecret,
            'urn:ietf:wg:oauth:2.0:oob'  // For manual copy/paste flow
        );
        
        // TODO: WHATS THIS REFRESH??  
        if (this.settings.googleRefreshToken) {
            this.googleAuth.setCredentials({
                refresh_token: this.settings.googleRefreshToken
            });
        }
    }

    initiateAuth() {
        if (!this.googleAuth) {
            this.setupGoogleAuth();
        }

        const authUrl = this.googleAuth.generateAuthUrl({
            access_type: 'offline',
            // TODO: Event vs. Task
            //scope: ['https://www.googleapis.com/auth/calendar'],
            scope: ['https://www.googleapis.com/auth/tasks'],
            prompt: 'consent'
        });

        async function successCallback() : Promise<any> {
            await this.googleAuth.saveSettings();
            this.googleAuth.setupGoogleAuth();
        }
        new AuthCodeModal(
            this.app, 
            authUrl,
            this.settings,
            successCallback).open();
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
            //const calendarUrl = await this.createCalendarEvent(date, file, line, blockId);
            const calendarUrl = await this.CreateTask(date, file, line, blockId);
            
            // Update the line with the new format: text #reminder [datetime](gcal_URL) ^blockId
            const formattedDateTime = format(date, 'yyyy-MM-dd HH:mm');
            const updatedLine = `${line} #reminder [${formattedDateTime}](${calendarUrl}) ^${blockId}`;
            editor.setLine(cursor.line, updatedLine);

            new Notice('Reminder created successfully!');
        } catch (error) {
            console.error('Failed to create reminder:', error);
            new Notice('Failed to create reminder');
        }
    }

    async CreateTask(
        date: Date,
        file: TFile,
        line: string,
        blockId: string) : Promise<string>
        {
            const taskListName = 'Obsidian';

            new Notice("Creating task in Google Tasks");
            const tasks = google.tasks({ version: 'v1', auth: this.googleAuth });

            const tasklists = await tasks.tasklists.list();
            const tasklist = tasklists?.data?.items?.find((list) => list.title === taskListName);
            if (!tasklist) {
                new Notice('No task list found with the name ' + taskListName);
                return '';
            }

            const task = await tasks.tasks.insert({
                tasklist: tasklist.id!,
                requestBody: {
                    title: line.trim() || 'Obsidian Reminder',
                    notes: this.createObsidianUrl(file, blockId),
                    due: date.toISOString()
                }
            });

            // Get the task URL
            return task.data.webViewLink || '';
        }

    async createCalendarEvent(
        date: Date,
        file: TFile,
        line: string,
        blockId: string) : Promise<string>
    {
        new Notice("Creating event in Google Calendar");
        const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });
            
        const event = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: line.trim() || 'Obsidian Reminder',
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


        // Get the calendar URL
        return event.data.htmlLink || '';
    }

    generateBlockId(): string {
        return Math.random().toString(36).substring(2, 8);
    }

    createObsidianUrl(file: TFile, blockId: string): string {
        // Get the file path and encode the entire path including any # symbols
        const filePath = file.path.replace(/#/g, '%23');
        
        // Create the URL with the block reference
        // TODO: prefix with special redirect URL thing
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
                .setValue(this.plugin.settings.googleClientId)
                .onChange(async (value) => {
                    this.plugin.settings.googleClientId = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Google Client Secret')
            .setDesc('Client Secret from Google Cloud Console')
            .addText(text => text
                .setPlaceholder('Enter client secret')
                .setValue(this.plugin.settings.googleClientSecret)
                .onChange(async (value) => {
                    this.plugin.settings.googleClientSecret = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Authentication')
            .setDesc('Connect to Google Calendar')
            .addButton(button => button
                .setButtonText(this.plugin.settings.googleRefreshToken ? 'Re-authenticate' : 'Connect to Google Calendar')
                .onClick(() => {
                    if (this.plugin.settings.googleClientId && this.plugin.settings.googleClientSecret) {
                        this.plugin.initiateAuth();
                    } else {
                        new Notice('Please enter Client ID and Client Secret first');
                    }
                }));
    }
}