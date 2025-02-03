import { 
    App, 
    Notice,
    Modal
} from 'obsidian';
import { FinishLoginGoogleMobile, StartLoginGoogleMobile } from 'googleApi/GoogleAuth';
import { IGoogleCalendarPluginSettings } from 'types/IGoogleCalendarPluginSettings';

export class AuthCodeModal extends Modal {
    // TODO setting so class variables are prefixed with _
    _authUrl: string;
    _pluginSettings: IGoogleCalendarPluginSettings;
    private _successCallbackAsync: () => any;

    constructor(
        app: App,
        authUrl: string,
        pluginSettings: IGoogleCalendarPluginSettings,
        successCallback: () => Promise<any>)
    {
        super(app);
        this._authUrl = authUrl;
        this._pluginSettings = pluginSettings;
        this._successCallbackAsync = successCallback;
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
            new Notice('Opening Google authentication page in your browser...');
            StartLoginGoogleMobile(this._pluginSettings);
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
                await FinishLoginGoogleMobile(
                    code,
                    this._pluginSettings,
                    this._successCallbackAsync());
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