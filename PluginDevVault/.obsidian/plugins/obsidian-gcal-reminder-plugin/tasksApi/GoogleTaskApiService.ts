import { GoogleApiError } from "googleApi/GoogleApiError";
import { callRequest } from "helper/RequestWrapper";
import { IGoogleCalendarPluginSettings } from "types/IGoogleCalendarPluginSettings";
import { GoogleTask } from "types/types";

export class GoogleTaskApiService {
    settings: IGoogleCalendarPluginSettings;
    
    constructor(
        settings: IGoogleCalendarPluginSettings)
    {
        this.settings = settings;
        
    }

    async googleCreateEvent(task: GoogleTask): Promise<string> {
        // TODO validate settings

        // TODO pull from settings
        const taskId = "Obsidian"
        // if(taskId === ""){
        //     throw new GoogleApiError("Could not create Google Event because no default calendar selected in Settings", null, 999, {error: "No calendar set"})    
        // }
    
        const createdEvent = await callRequest(
            `https://www.googleapis.com/calendar/v3/calendars/${taskId}/events?conferenceDataVersion=1`,
            'POST',
            task)

        return createdEvent;
    }
}
