import { 
    App, 
    Notice,
    Modal
} from 'obsidian';

// ********************************
// "It isn't possible to read or write the time that a task is due via the API."
// source: https://developers.google.com/tasks/reference/rest/v1/tasks#Task
// issue: https://issuetracker.google.com/issues/166896024
// 
// MS To-do API allows setting time: https://learn.microsoft.com/en-us/graph/api/todotasklist-post-tasks?view=graph-rest-1.0&tabs=http
// ********************************
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

        this.initializeDatePicker(contentEl);
        //this.initliazeDateTimePicker(contentEl);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    initliazeDateTimePicker(contentEl: HTMLElement) {
        contentEl.createEl('h2', { text: 'Set Reminder Date and Time' });

        // Create container for the picker
        const pickerContainer = contentEl.createDiv({ cls: 'datetime-picker-container' });
        
        // Create datetime picker
        const input = pickerContainer.createEl('input', {
            type: 'datetime-local',
            cls: 'datetime-input'
        });

        // Set default to next hour
        const now = new Date();
        now.setHours(now.getHours() + 1, 0, 0, 0);
        input.value = now.toISOString().slice(0, 16);

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
            const selectedDate = new Date(input.value);
            if (!isNaN(selectedDate.getTime())) {
                this.close();
                this.onSubmit(selectedDate);
            } else {
                new Notice('Please select a valid date and time');
            }
        });

        // Add some basic styles
        pickerContainer.style.textAlign = 'center';
        input.style.margin = '20px 0';
        input.style.padding = '8px';
    }

    initializeDatePicker(contentEl: HTMLElement)
    {
        contentEl.createEl('h2', { text: 'Set Reminder Date' });

        // Create container for the picker
        const pickerContainer = contentEl.createDiv({ cls: 'date-picker-container' });
        
        // Create date picker (type="date" shows only date selection)
        const input = pickerContainer.createEl('input', {
            type: 'date',
            cls: 'date-input'
        });

        // Set default to today
        const now = new Date();
        input.value = now.toISOString().split('T')[0];

        // Create button container
        const buttonContainer = contentEl.createDiv({ 
            cls: 'date-picker-buttons',
            attr: { style: 'margin-top: 20px;' }
        });

        // Create submit button
        const submitBtn = buttonContainer.createEl('button', { 
            text: 'Create Reminder',
            cls: 'mod-cta'
        });
        
        submitBtn.addEventListener('click', () => {
            const selectedDate = new Date(input.value);
            if (!isNaN(selectedDate.getTime())) {
                this.close();
                // Set time to midnight UTC to ensure consistent date handling
                selectedDate.setUTCHours(0, 0, 0, 0);
                this.onSubmit(selectedDate);
            } else {
                new Notice('Please select a valid date');
            }
        });

        // Add some basic styles
        pickerContainer.style.textAlign = 'center';
        input.style.margin = '20px 0';
        input.style.padding = '8px';
    }
}