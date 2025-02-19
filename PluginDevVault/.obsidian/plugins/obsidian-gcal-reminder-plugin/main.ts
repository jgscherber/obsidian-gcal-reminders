import { 
    App, 
    MarkdownView, 
    Plugin, 
    PluginSettingTab, 
    Setting, 
    TFile,
    Notice,
} from 'obsidian';
import * as option from 'fp-ts/Option';
import { format } from 'date-fns';
import { AuthCodeModal } from 'views/AuthCodeModal'
import { IGoogleCalendarPluginSettings } from 'types/IGoogleCalendarPluginSettings';
import { DateTimePickerModal } from 'views/DateTimePickerModal';
import { GoogleTask } from 'types/types';
import { GoogleTaskApiService } from 'tasksApi/GoogleTaskApiService';
import { GetGoogleAuthToken, TryGetAccessToken } from 'googleApi/GoogleAuth';

export default class GCalReminderPlugin extends Plugin {

    settings: IGoogleCalendarPluginSettings;

    async onload() {
        await this.loadSettings();

        // Add command to create reminder
        this.addCommand({
            id: 'add-gcal-reminder',
            name: 'Add Google Calendar Reminder',
            checkCallback: (onlyCheckingContext: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!onlyCheckingContext) {
                        (async () => {
                            let tokenOption = await GetGoogleAuthToken(this.settings);
                            if (option.isNone(tokenOption)) {
                                new Notice('Please authenticate with Google Calendar in settings first');
                                return;
                            }
                            this.showDateTimePicker(markdownView);
                        })();
                    }
                    return true;
                }
                return false;
            }
        });

        // Add settings tab
        this.addSettingTab(new GCalReminderSettingTab(this.app, this));
    }

    InitiateAuth() {
        async function successCallback() : Promise<any> {
        }
        
        new AuthCodeModal(
            this.app, 
            this.settings,
            successCallback).open();
    }

    showDateTimePicker(markdownView: MarkdownView) {
        new DateTimePickerModal(
            this.app,
            async (date) =>
            {
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
            cursor.line

            const originalText = editor.getLine(cursor.line);
            let lineText = this.RemoveMarkdown(originalText);
            if (lineText.length === 0 && cursor.line > 0) {
                // Line is empty so try getting nearest header
                let currentLineNum = cursor.line - 1;
                do
                {
                    lineText = editor.getLine(currentLineNum);
                    if (lineText.startsWith('#')) {
                        lineText = this.RemoveMarkdown(lineText);
                        break;
                    }
                    currentLineNum--;
                } while (currentLineNum >= 0)
            }
            
            // Create Google Calendar event
            //const calendarUrl = await this.createCalendarEvent(date, file, line, blockId);
            const calendarUrl = await this.CreateTask(date, file, lineText, blockId);
            
            // Update the line with the new format: text #reminder [datetime](gcal_URL) ^blockId
            //const formattedDateTime = format(date, 'yyyy-MM-dd HH:mm');
            const formattedDateTime = format(date, 'yyyy-MM-dd');
            const reminderTag = this.settings.obsidianTag;
            const updatedLine = `${originalText} #${reminderTag} [${formattedDateTime}](${calendarUrl}) ^${blockId}`;
            editor.setLine(cursor.line, updatedLine);

            new Notice('Reminder created successfully!');
        } catch (error) {
            console.error('Failed to create reminder:', error);
            new Notice('Failed to create reminder');
        }
    }

    async GetTaskListId() {
        const taskService = new GoogleTaskApiService(this.settings);
        const taskListId = await taskService.GetTaskListId();
        if (!option.isSome(taskListId)) {
            new Notice('No task list found with the name ' + this.settings.googleTaskListName);
        }
        else {
            new Notice('Task list found');
            this.settings.googleTaskListId = taskListId.value;
            await this.saveSettings();
        }
    }

    async CreateTask(
        date: Date,
        file: TFile,
        line: string,
        blockId: string) : Promise<string>
    {
        let title = file.basename
        line = this.RemoveMarkdown(line);
        if (line)
        {
            title = `${title}: ${line}`;
        }

        const taskRequest : GoogleTask = {
            title: title,
            notes: this.createObsidianUrl(file, blockId),
            due: date.toISOString()
        };

        const taskService = new GoogleTaskApiService(this.settings);

        const task = await taskService.Create(taskRequest);

        // Get the task URL
        return task?.webViewLink || '';
    }

    RemoveMarkdown(line: string)
    {
        console.log(line);
        return line
            .replace('-', '')
            .replace('#', '')
            .replace('>', '')
            .replace('==', '')
            .trim();
    }

    generateBlockId(): string {
        return Math.random().toString(36).substring(2, 8);
    }

    createObsidianUrl(file: TFile, blockId: string): string {
        const filePath = file.path.replace(/#/g, '%23');
        const helperUrl = this.settings.obsidianRedirctHelperUrl;
        const safeFilePath = encodeURIComponent(filePath);
        const obsidianUrl = `obsidian://open?vault=${encodeURIComponent(this.app.vault.getName())}&file=${safeFilePath}%23%5E${blockId}`
        return `${helperUrl}?${obsidianUrl}`;
    }

    async loadSettings() {
        this.settings = Object.assign({
            clientId: '',
            clientSecret: '',
            refreshToken: '',
            obsidianRedirctHelperUrl: ''
        }, await this.loadData());

        // TODO add this to UI
        this.settings.obsidianTag = 'reminder/generated'
        this.settings.obsidianRedirctHelperUrl = "https://jgscherber.github.io/obsidian-redirect-page";
        this.settings.googleTaskListName = "Obsidian";
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
                .setName('Obsidian Redirect URL')
                .setDesc('URL which will perform the redirect for the appended Obsidian link')
                .addText(text => text
                    .setPlaceholder('Enter redirect URL')
                    .setValue(this.plugin.settings.obsidianRedirctHelperUrl)
                    // TODO why is there both setValue and onChange??
                    .onChange(async (value) => {
                        this.plugin.settings.obsidianRedirctHelperUrl = value;
                        await this.plugin.saveSettings();
                    }));

        new Setting(containerEl)
            .setName('Authentication')
            .setDesc('Connect to Google Calendar')
            .addButton(button => button
                .setButtonText('Connect')
                .onClick(() => {
                    if (this.plugin.settings.googleClientId
                        && this.plugin.settings.googleClientSecret)
                    {
                        this.plugin.InitiateAuth();
                        this.plugin.GetTaskListId();
                    }
                    else
                    {
                        new Notice('Please enter Client ID and Client Secret first');
                    }
                }));
    }
}