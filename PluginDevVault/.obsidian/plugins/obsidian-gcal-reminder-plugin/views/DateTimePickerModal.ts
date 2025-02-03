import { 
    App, 
    Notice,
    Modal
} from 'obsidian';

export class DateTimePickerModal extends Modal {
    onSubmit: (result: Date) => void;

    constructor(
        app: App,
        onSubmit: (result: Date) => void)
    {
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