
export interface IGoogleCalendarPluginSettings {
    
    // Authentication settings
    googleClientId: string;
    googleClientSecret: string;
    
    // Task List setting
    googleTaskListName: string;
    googleTaskListId: string;

    // Obsidian settings
    obsidianTag: string;
    obsidianRedirctHelperUrl: string;
	
    // // Notification settings
    // useNotification: boolean;
	// showNotice: boolean;
	
    // // Event note settings
    // eventNoteNameFormat: string;
    // optionalNotePrefix: string;
    // defaultTemplate: string;
	// defaultFolder: string;
    // autoCreateEventNotes: boolean;
	// 	autoCreateEventNotesMarker: string;
    //     autoCreateEventKeepOpen: boolean;
    //     importStartOffset: number;
    //     importEndOffset: number;

    // // Calendar settings
    // defaultCalendar: string;
    // calendarBlackList: [string, string][];
	// ignorePatternList: string[];
    // insertTemplates: Template[];
    // useDefaultTemplate: boolean;
    
    // // Daily note settings
    // activateDailyNoteAddon: boolean;
    // dailyNoteDotColor: string;
    // useWeeklyNotes: boolean;
    
    // // Hidden settings
    // timelineHourFormat: number;
    // usDateFormat: boolean;

    // // General settings
    // refreshInterval: number;
    // atAnnotationEnabled: boolean;
    // debugMode: boolean;

	// viewSettings: { [type in string]: CodeBlockOptions };
}